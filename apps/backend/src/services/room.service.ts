import { randomBytes } from 'node:crypto';

import { ERROR_CODES } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import type { RoomLifecycleService } from './room-lifecycle.service';
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
  KickedMemberRecord,
  LeaveRoomResult,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomMemberLookupRecord,
  RoomMineRecord,
  RoomRecord,
  RoomSnapshotResult,
  RoomUpdateRecord,
} from '../types/room';
import type { PresenceUpdatePayload, RoomClosedPayload, RoomKickedPayload } from '../types/socket';
import { toChatSystemPayload } from '../utils/chatPayload';
import {
  assertActiveRoomMember,
  assertJoinableRoomMember,
  assertRoomHost,
} from '../utils/roomAccess';

const INVITE_CODE_RETRY_LIMIT = 3;
const RECENT_CHAT_LIMIT = 50;
const ROOM_RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class RoomService {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: ICache,
    private readonly playlistRepo: Pick<IPlaylistRepository, 'getPlaylist'>,
    private readonly chatRepo: Pick<IChatRepository, 'findLatestChats' | 'createMessage'>,
    private readonly playbackService: Pick<PlaybackService, 'clearSession' | 'resetSession'>,
    private readonly roomLifecycleService: Pick<RoomLifecycleService, 'inactivateStaleRooms'>,
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

    const membership = await this.roomRepo.findMembership(room.id, userId);
    if (membership?.status === 'kicked') {
      throw new AppError(403, ERROR_CODES.ROOM_MEMBER_KICKED, 'Host에 의해 추방된 사용자입니다.');
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
    body: { name: string } | { status: 'closed' } | { status: 'active' },
  ): Promise<RoomUpdateRecord> {
    const room = await this.roomRepo.findRoomById(roomId);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room 정보를 수정할 수 있습니다.');
    }

    if ('name' in body) {
      if (room.status !== 'active') {
        throw new AppError(
          409,
          ERROR_CODES.ROOM_NOT_ACTIVE,
          'active 상태의 Room만 이름을 바꿀 수 있습니다.',
        );
      }
      return this.roomRepo.updateRoomName(roomId, body.name);
    }

    if (body.status === 'closed') {
      if (room.status === 'closed') {
        throw new AppError(403, ERROR_CODES.ROOM_CLOSED, '이미 종료된 Room입니다.');
      }
      if (room.status === 'inactive') {
        throw new AppError(403, ERROR_CODES.ROOM_INACTIVE, '비활성화된 Room입니다.');
      }
      return this.closeRoomAndBroadcast(roomId, userId);
    }

    if (room.status !== 'closed') {
      throw new AppError(409, ERROR_CODES.ROOM_NOT_CLOSED, '복구 대상이 closed 상태가 아닙니다.');
    }
    return this.recoverRoom(room);
  }

  async getMyRooms(userId: string): Promise<RoomMineRecord[]> {
    await this.roomLifecycleService.inactivateStaleRooms();
    return this.roomRepo.findRoomsByHostId(userId);
  }

  async deactivateRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.roomRepo.findRoomById(roomId);
    if (!room) {
      throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
    }
    if (room.hostId !== userId) {
      throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 Room을 비활성화할 수 있습니다.');
    }
    if (room.status !== 'closed') {
      throw new AppError(
        409,
        ERROR_CODES.ROOM_NOT_CLOSED,
        '비활성화 대상이 closed 상태가 아닙니다.',
      );
    }
    await this.roomRepo.deactivateRoom(roomId);
  }

  async setMemberOnline(
    roomId: string,
    userId: string,
  ): Promise<{ member: RoomMemberRecord; wasOnline: boolean }> {
    await assertJoinableRoomMember(this.roomRepo, roomId, userId);
    const didTransition = await this.roomRepo.updateMemberStatus(roomId, userId, 'online', [
      'offline',
      'left',
    ]);
    const member = await this.findRequiredMemberInfo(roomId, userId);

    return { member, wasOnline: !didTransition };
  }

  async getMembers(roomId: string): Promise<RoomMemberRecord[]> {
    return this.roomRepo.findMembers(roomId);
  }

  async getActiveMembers(roomId: string, hostUserId: string): Promise<RoomMemberRecord[]> {
    await assertRoomHost(this.roomRepo, roomId, hostUserId);
    return this.roomRepo.findMembers(roomId);
  }

  async getKickedMembers(roomId: string, hostUserId: string): Promise<KickedMemberRecord[]> {
    await assertRoomHost(this.roomRepo, roomId, hostUserId);
    return this.roomRepo.findKickedMembers(roomId);
  }

  async kickMember(
    roomId: string,
    hostUserId: string,
    memberId: string,
  ): Promise<{ memberId: string; status: 'kicked' }> {
    const room = await assertRoomHost(this.roomRepo, roomId, hostUserId);
    this.assertRoomIsActive(room.status);

    const member = await this.roomRepo.findMemberById(roomId, memberId);
    if (!member) {
      throw new AppError(404, ERROR_CODES.ROOM_MEMBER_NOT_FOUND, '참여자를 찾을 수 없습니다.');
    }
    if (member.userId === room.hostId) {
      throw new AppError(409, ERROR_CODES.ROOM_CANNOT_KICK_HOST, 'Host는 추방할 수 없습니다.');
    }

    const didTransition = await this.roomRepo.updateMemberStatusByMemberId(
      roomId,
      memberId,
      'kicked',
      ['online', 'offline'],
    );
    if (!didTransition) {
      throw new AppError(
        404,
        ERROR_CODES.ROOM_MEMBER_NOT_FOUND,
        '추방할 수 없는 상태의 참여자입니다.',
      );
    }

    await this.disconnectAndNotifyKicked(roomId, member);
    return { memberId, status: 'kicked' };
  }

  async unkickMember(
    roomId: string,
    hostUserId: string,
    memberId: string,
  ): Promise<{ memberId: string; status: 'left' }> {
    const room = await assertRoomHost(this.roomRepo, roomId, hostUserId);
    this.assertRoomIsActive(room.status);

    const member = await this.roomRepo.findMemberById(roomId, memberId);
    if (!member) {
      throw new AppError(404, ERROR_CODES.ROOM_MEMBER_NOT_FOUND, '참여자를 찾을 수 없습니다.');
    }

    const didTransition = await this.roomRepo.updateMemberStatusByMemberId(
      roomId,
      memberId,
      'left',
      ['kicked'],
    );
    if (!didTransition) {
      throw new AppError(409, ERROR_CODES.ROOM_MEMBER_NOT_KICKED, '추방 상태가 아닙니다.');
    }

    return { memberId, status: 'left' };
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

  private async recoverRoom(room: RoomDetailRecord): Promise<RoomUpdateRecord> {
    const isExpired =
      room.closedAt !== null && Date.now() - room.closedAt.getTime() >= ROOM_RECOVERY_WINDOW_MS;
    if (isExpired) {
      await this.roomLifecycleService.inactivateStaleRooms();
      throw new AppError(
        409,
        ERROR_CODES.ROOM_RECOVERY_EXPIRED,
        '30일이 지나 더 이상 복구할 수 없습니다.',
      );
    }

    const recovered = await this.roomRepo.recoverRoom(room.id);
    const resetPayload = this.playbackService.resetSession(room.id);
    broadcastToRoom(room.id, 'playback:reset', resetPayload);
    return recovered;
  }

  private async findRequiredMemberInfo(roomId: string, userId: string): Promise<RoomMemberRecord> {
    const member = await this.roomRepo.findMemberInfo(roomId, userId);
    if (!member) {
      throw new AppError(500, ERROR_CODES.SERVER_INTERNAL_ERROR, '참여자 정보를 찾을 수 없습니다.');
    }

    return member;
  }

  private assertRoomIsActive(status: RoomDetailRecord['status']): void {
    if (status === 'closed') {
      throw new AppError(403, ERROR_CODES.ROOM_CLOSED, '종료된 Room입니다.');
    }
    if (status === 'inactive') {
      throw new AppError(403, ERROR_CODES.ROOM_INACTIVE, '비활성화된 Room입니다.');
    }
  }

  private async disconnectAndNotifyKicked(
    roomId: string,
    member: Pick<RoomMemberLookupRecord, 'userId' | 'nickname' | 'profileImage' | 'role'>,
  ): Promise<void> {
    const roomKey = `room:${roomId}`;
    const io = getIo();
    const payload: RoomKickedPayload = {
      roomId,
      message: 'Host에 의해 Room에서 추방되었습니다.',
    };
    const sockets = await io.in(roomKey).fetchSockets();

    for (const targetSocket of sockets) {
      if (targetSocket.data.userId !== member.userId) continue;
      targetSocket.emit('room:kicked', payload);
      await targetSocket.leave(roomKey);
    }

    const presencePayload: PresenceUpdatePayload = {
      userId: member.userId,
      nickname: member.nickname,
      profileImage: member.profileImage,
      role: member.role,
      status: 'left',
    };
    broadcastToRoom(roomId, 'presence:update', presencePayload);
  }
}
