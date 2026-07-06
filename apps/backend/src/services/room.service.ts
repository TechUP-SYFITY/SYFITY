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
  PlaybackStateRecord,
  PlaybackStateResult,
  RoomDetailRecord,
  RoomRecord,
} from '../types/room';

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
}
