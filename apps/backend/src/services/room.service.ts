import { randomBytes } from 'node:crypto';

import { ERROR_CODES } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { getIo } from '../lib/io';
import type { ChatMessageRecord, IChatRepository } from '../types/chat';
import type { IPlaylistRepository } from '../types/playlist';
import type {
  IRoomRepository,
  JoinRoomResult,
  LeaveRoomResult,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';
import type { ChatSystemPayload, RoomClosedPayload } from '../types/socket';
import { toChatSystemPayload } from '../utils/chatPayload';
import { assertActiveRoomMember } from '../utils/roomAccess';

const INVITE_CODE_RETRY_LIMIT = 3;
const RECENT_CHAT_LIMIT = 50;

type RoomClosedEmitter = {
  emit(event: 'room:closed', payload: RoomClosedPayload): boolean;
  emit(event: 'chat:system', payload: ChatSystemPayload): boolean;
};

export type RoomSocketServer = {
  to(room: string): RoomClosedEmitter;
  socketsLeave(room: string): void;
};

export class RoomService {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: ICache,
    private readonly playlistRepo: Pick<IPlaylistRepository, 'getPlaylist'>,
    private readonly chatRepo: Pick<IChatRepository, 'findLatestChats' | 'createMessage'>,
    private readonly playbackService: Pick<
      PlaybackService,
      'getPlaybackStateForJoin' | 'initializeCache' | 'clearCache'
    >,
  ) {}

  async createRoom(userId: string, name: string): Promise<RoomRecord> {
    const inviteCode = await this.generateUniqueInviteCode();
    const room = await this.roomRepo.createRoom({ name, hostId: userId, inviteCode });

    this.playbackService.initializeCache(room.id);

    return room;
  }

  async joinRoom(userId: string, inviteCode: string): Promise<JoinRoomResult> {
    const room = await this.roomRepo.findRoomByInviteCode(inviteCode);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }
    if (room.status === 'closed') {
      throw new AppError(403, ERROR_CODES.ROOM_CLOSED, '종료된 Room입니다.');
    }
    if (room.status === 'inactive') {
      throw new AppError(403, ERROR_CODES.ROOM_INACTIVE, '비활성화된 Room입니다.');
    }

    await this.roomRepo.upsertMembership(room.id, userId);
    await this.roomRepo.upsertRecentRoom(userId, room.id);

    const [playbackState, playlist, members, recentChats] = await Promise.all([
      this.playbackService.getPlaybackStateForJoin(room.id),
      this.playlistRepo.getPlaylist(room.id),
      this.roomRepo.findMembers(room.id),
      this.chatRepo.findLatestChats(room.id, RECENT_CHAT_LIMIT),
    ]);

    return {
      room,
      playbackState,
      playlist,
      members,
      recentChats,
    };
  }

  async getRoomInfo(roomId: string, userId: string): Promise<RoomDetailRecord> {
    const room = await this.roomRepo.findRoomById(roomId);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }

    const membership = await this.roomRepo.findMembership(roomId, userId);
    if (!membership) {
      throw new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.');
    }

    return room;
  }

  async updateRoom(roomId: string, userId: string, name: string): Promise<RoomUpdateRecord> {
    const room = await this.roomRepo.findRoomById(roomId);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room 정보를 수정할 수 있습니다.');
    }

    return this.roomRepo.updateRoomName(roomId, name);
  }

  async setMemberOnline(
    roomId: string,
    userId: string,
  ): Promise<{ member: RoomMemberRecord; wasOnline: boolean }> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);
    const previousMembership = await this.roomRepo.findMembership(roomId, userId);
    const wasOnline = previousMembership?.status === 'online';

    await this.roomRepo.updateMemberStatus(roomId, userId, 'online');
    await this.roomRepo.touchLastActivity(roomId);
    const member = await this.findRequiredMemberInfo(roomId, userId);

    return { member, wasOnline };
  }

  async leaveRoom(roomId: string, userId: string): Promise<LeaveRoomResult> {
    const room = await assertActiveRoomMember(this.roomRepo, roomId, userId);
    if (room.hostId === userId) {
      await this.closeRoom(roomId, userId);
      return { type: 'closed' };
    }

    await this.roomRepo.updateMemberStatus(roomId, userId, 'left');
    await this.roomRepo.touchLastActivity(roomId);
    const member = await this.findRequiredMemberInfo(roomId, userId);

    return { type: 'left', member };
  }

  async closeRoom(roomId: string, userId: string): Promise<RoomDetailRecord> {
    const room = await assertActiveRoomMember(this.roomRepo, roomId, userId);
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room을 종료할 수 있습니다.');
    }

    await this.roomRepo.closeRoom(roomId);
    this.playbackService.clearCache(roomId);

    return room;
  }

  async createSystemMessage(roomId: string, message: string): Promise<ChatMessageRecord | null> {
    try {
      return await this.chatRepo.createMessage({
        roomId,
        userId: null,
        type: 'system',
        message,
      });
    } catch (err) {
      // 시스템 메시지는 부가 기능이므로 실패해도 입장/퇴장/종료 흐름을 막지 않는다.
      // eslint-disable-next-line no-console
      console.error('[RoomService.createSystemMessage] 시스템 메시지 생성 실패', err);
      return null;
    }
  }

  async closeRoomAndBroadcast(roomId: string, userId: string): Promise<void> {
    const io: RoomSocketServer = getIo();
    await this.closeRoom(roomId, userId);

    const systemMessage = await this.createSystemMessage(roomId, 'Room이 종료되었습니다.');
    if (systemMessage) {
      io.to(`room:${roomId}`).emit('chat:system', toChatSystemPayload(systemMessage));
    }

    const payload: RoomClosedPayload = { roomId, reason: 'host-closed' };
    io.to(`room:${roomId}`).emit('room:closed', payload);
    io.socketsLeave(`room:${roomId}`);
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < INVITE_CODE_RETRY_LIMIT; attempt += 1) {
      const code = randomBytes(3).toString('hex').toUpperCase();
      const exists = await this.roomRepo.existsInviteCode(code);
      if (!exists) return code;
    }

    throw new AppError(
      500,
      ERROR_CODES.SERVER_INVITE_CODE_GENERATION_FAILED,
      '초대 코드 생성에 실패했습니다.',
    );
  }

  private async findRequiredMemberInfo(roomId: string, userId: string): Promise<RoomMemberRecord> {
    const member = await this.roomRepo.findMemberInfo(roomId, userId);
    if (!member) {
      throw new AppError(500, ERROR_CODES.SERVER_INTERNAL_ERROR, '참여자 정보를 찾을 수 없습니다.');
    }

    return member;
  }
}
