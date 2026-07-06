import { randomBytes } from 'node:crypto';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { PlaybackStateCache } from '../types/cache';
import type { IChatRepository } from '../types/chat';
import type { IPlaylistRepository } from '../types/playlist';
import type {
  IRoomRepository,
  JoinRoomResult,
  LeaveRoomResult,
  PlaybackStateRecord,
  PlaybackStateResult,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
} from '../types/room';
import type { PlaybackStatePayload } from '../types/socket';
import { assertActiveRoomMember } from '../utils/roomAccess';

const INVITE_CODE_RETRY_LIMIT = 3;
const RECENT_CHAT_LIMIT = 50;

const INITIAL_PLAYBACK_STATE: PlaybackStateCache = {
  videoId: null,
  playlistItemId: null,
  baseCurrentTime: 0,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: null,
};

export class RoomService {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly cache: ICache,
    private readonly playlistRepo: Pick<IPlaylistRepository, 'getPlaylist'>,
    private readonly chatRepo: Pick<IChatRepository, 'findLatestChats'>,
  ) {}

  async createRoom(userId: string, name: string): Promise<RoomRecord> {
    const inviteCode = await this.generateUniqueInviteCode();
    const room = await this.roomRepo.createRoom({ name, hostId: userId, inviteCode });

    this.cache.set(CacheKeys.playbackState(room.id), INITIAL_PLAYBACK_STATE);

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

    const [playbackRecord, playlist, members, recentChats] = await Promise.all([
      this.roomRepo.findPlaybackState(room.id),
      this.playlistRepo.getPlaylist(room.id),
      this.roomRepo.findMembers(room.id),
      this.chatRepo.findLatestChats(room.id, RECENT_CHAT_LIMIT),
    ]);

    if (!playbackRecord) {
      throw new AppError(
        500,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        'PlaybackState를 찾을 수 없습니다.',
      );
    }

    return {
      room,
      playbackState: this.toPlaybackStateResult(playbackRecord),
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

  async setMemberOnline(roomId: string, userId: string): Promise<RoomMemberRecord> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);
    await this.roomRepo.updateMemberStatus(roomId, userId, 'online');
    await this.roomRepo.touchLastActivity(roomId);

    return this.findRequiredMemberInfo(roomId, userId);
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
    this.cache.del(CacheKeys.playbackState(roomId));
    this.cache.del(CacheKeys.presence(roomId));

    return room;
  }

  async getPlaybackStateForSocket(roomId: string): Promise<PlaybackStatePayload> {
    const cached = this.cache.get<PlaybackStateCache>(CacheKeys.playbackState(roomId));
    if (cached) {
      return this.toPlaybackStatePayload(cached);
    }

    const record = await this.roomRepo.findPlaybackState(roomId);
    if (!record) {
      throw new AppError(
        500,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        'PlaybackState를 찾을 수 없습니다.',
      );
    }

    const nextCache: PlaybackStateCache = {
      videoId: record.videoId,
      playlistItemId: record.playlistItemId,
      baseCurrentTime: record.baseCurrentTime,
      isPlaying: record.isPlaying,
      serverStartedAt: record.serverStartedAt?.toISOString() ?? null,
      serverPausedAt: record.serverPausedAt?.toISOString() ?? null,
    };

    this.cache.set(CacheKeys.playbackState(roomId), nextCache);

    return this.toPlaybackStatePayload(nextCache);
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

  private toPlaybackStateResult(record: PlaybackStateRecord): PlaybackStateResult {
    const currentTime =
      record.isPlaying && record.serverStartedAt
        ? record.baseCurrentTime + (Date.now() - record.serverStartedAt.getTime()) / 1000
        : record.baseCurrentTime;

    return {
      videoId: record.videoId,
      playlistItemId: record.playlistItemId,
      currentTime,
      isPlaying: record.isPlaying,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toPlaybackStatePayload(cached: PlaybackStateCache): PlaybackStatePayload {
    const currentTime =
      cached.isPlaying && cached.serverStartedAt
        ? cached.baseCurrentTime + (Date.now() - new Date(cached.serverStartedAt).getTime()) / 1000
        : cached.baseCurrentTime;

    return {
      videoId: cached.videoId,
      playlistItemId: cached.playlistItemId,
      currentTime,
      isPlaying: cached.isPlaying,
    };
  }

  private async findRequiredMemberInfo(roomId: string, userId: string): Promise<RoomMemberRecord> {
    const member = await this.roomRepo.findMemberInfo(roomId, userId);
    if (!member) {
      throw new AppError(500, ERROR_CODES.SERVER_INTERNAL_ERROR, '참여자 정보를 찾을 수 없습니다.');
    }

    return member;
  }
}
