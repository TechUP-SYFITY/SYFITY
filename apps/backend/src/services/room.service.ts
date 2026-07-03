import { randomBytes } from 'node:crypto';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { PlaybackStateCache } from '../types/cache';
import type { IRoomRepository, RoomRecord } from '../types/room';
import type { IUserRepository } from '../types/user';

const INVITE_CODE_RETRY_LIMIT = 3;

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
    private readonly userRepo: Pick<IUserRepository, 'findUserById'>,
    private readonly cache: ICache,
  ) {}

  async createRoom(userId: string, name: string): Promise<RoomRecord> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) {
      throw new AppError(404, ERROR_CODES.AUTH_USER_NOT_FOUND, '사용자를 찾을 수 없습니다.');
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const room = await this.roomRepo.createRoom({ name, hostId: userId, inviteCode });

    this.cache.set(CacheKeys.playbackState(room.id), INITIAL_PLAYBACK_STATE);

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
}
