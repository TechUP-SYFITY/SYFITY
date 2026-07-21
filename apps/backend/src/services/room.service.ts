import { randomBytes } from 'node:crypto';

import { ERROR_CODES } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { getIo } from '../lib/io';
import { logger } from '../lib/logger';
import { broadcastToRoom } from '../socket/broadcast';
import type { ChatMessageRecord, IChatRepository } from '../types/chat';
import type { IPlaylistRepository } from '../types/playlist';
import type {
  IRoomRepository,
  CreateMembershipResult,
  LeaveRoomResult,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
  RoomSnapshotResult,
  RoomUpdateRecord,
} from '../types/room';
import type { RoomClosedPayload } from '../types/socket';
import { toChatSystemPayload } from '../utils/chatPayload';
import { assertActiveRoomMember } from '../utils/roomAccess';

const INVITE_CODE_RETRY_LIMIT = 3;
const RECENT_CHAT_LIMIT = 50;

export class RoomService {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: ICache,
    private readonly playlistRepo: Pick<IPlaylistRepository, 'getPlaylist'>,
    private readonly chatRepo: Pick<IChatRepository, 'findLatestChats' | 'createMessage'>,
    private readonly playbackService: Pick<PlaybackService, 'clearSession'>,
  ) {}

  async createRoom(userId: string, name: string): Promise<RoomRecord> {
    const inviteCode = await this.generateUniqueInviteCode();
    const room = await this.roomRepo.createRoom({ name, hostId: userId, inviteCode });

    await this.roomRepo.upsertRecentRoom(userId, room.id);
    return room;
  }

  async createMembership(userId: string, inviteCode: string): Promise<CreateMembershipResult> {
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

    const isNewMembership = await this.roomRepo.upsertMembership(room.id, userId);
    await this.roomRepo.upsertRecentRoom(userId, room.id);

    return { room, isNewMembership };
  }

  async getRoomSnapshot(roomId: string): Promise<RoomSnapshotResult> {
    const [playlist, members, recentChats] = await Promise.all([
      this.playlistRepo.getPlaylist(roomId),
      this.roomRepo.findMembers(roomId),
      this.chatRepo.findLatestChats(roomId, RECENT_CHAT_LIMIT),
    ]);

    return { playlist, members, recentChats };
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

  async updateRoom(
    roomId: string,
    userId: string,
    body: { name: string } | { status: 'closed' },
  ): Promise<RoomUpdateRecord> {
    const room = await this.roomRepo.findRoomById(roomId);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room 정보를 수정할 수 있습니다.');
    }

    if ('status' in body) {
      return this.closeRoomAndBroadcast(roomId, userId);
    }

    return this.roomRepo.updateRoomName(roomId, body.name);
  }

  async setMemberOnline(
    roomId: string,
    userId: string,
  ): Promise<{ member: RoomMemberRecord; wasOnline: boolean }> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);
    const didTransition = await this.roomRepo.updateMemberStatus(roomId, userId, 'online', [
      'offline',
    ]);
    await this.roomRepo.touchLastActivity(roomId);
    const member = await this.findRequiredMemberInfo(roomId, userId);

    return { member, wasOnline: !didTransition };
  }

  async getMembers(roomId: string): Promise<RoomMemberRecord[]> {
    return this.roomRepo.findMembers(roomId);
  }

  async leaveRoom(roomId: string, userId: string): Promise<LeaveRoomResult> {
    const room = await assertActiveRoomMember(this.roomRepo, roomId, userId);
    if (room.hostId === userId) {
      await this.closeRoom(roomId, userId);
      return { type: 'closed' };
    }

    const didTransition = await this.roomRepo.updateMemberStatus(roomId, userId, 'left', [
      'online',
      'offline',
    ]);
    if (!didTransition) {
      return { type: 'noop' };
    }

    await this.roomRepo.touchLastActivity(roomId);
    const member = await this.findRequiredMemberInfo(roomId, userId);

    return { type: 'left', member };
  }

  async closeRoom(roomId: string, userId: string): Promise<RoomUpdateRecord> {
    const room = await assertActiveRoomMember(this.roomRepo, roomId, userId);
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room을 종료할 수 있습니다.');
    }

    const closedRoom = await this.roomRepo.closeRoom(roomId);
    this.playbackService.clearSession(roomId);

    return closedRoom;
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
      logger.error({ err, roomId }, '[RoomService.createSystemMessage] 시스템 메시지 생성 실패');
      return null;
    }
  }

  async closeRoomAndBroadcast(roomId: string, userId: string): Promise<RoomUpdateRecord> {
    const io = getIo();
    const room = await this.closeRoom(roomId, userId);

    const systemMessage = await this.createSystemMessage(roomId, 'Room이 종료되었습니다.');
    if (systemMessage) {
      broadcastToRoom(roomId, 'chat:system', toChatSystemPayload(systemMessage));
    }

    const payload: RoomClosedPayload = { roomId, reason: 'host-closed' };
    broadcastToRoom(roomId, 'room:closed', payload);
    io.socketsLeave(`room:${roomId}`);
    return room;
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
