import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import type { PlaybackStateCache } from '../types/cache';
import type {
  IPlaybackRepository,
  PlaybackErrorResult,
  PlaybackStateRecord,
  PlaybackStateResult,
  PlaybackStateUpdateData,
} from '../types/playback';
import { toPlaylistItem, type IPlaylistRepository } from '../types/playlist';
import type { IRoomRepository } from '../types/room';
import type { PlaybackStatePayload } from '../types/socket';
import { assertActiveRoomMember, assertRoomHost } from '../utils/roomAccess';

const INITIAL_PLAYBACK_STATE_CACHE: PlaybackStateCache = {
  videoId: null,
  playlistItemId: null,
  baseCurrentTime: 0,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: null,
};

type PlaybackRoomRepo = Pick<
  IRoomRepository,
  'findRoomById' | 'findMembership' | 'touchLastActivity'
>;
type PlaybackPlaylistRepo = Pick<
  IPlaylistRepository,
  'findItemById' | 'getPlaylist' | 'markUnavailable'
>;
type PlaybackYoutubeClient = Pick<IYouTubeClient, 'getVideoDetails'>;

export type PlaybackPlayResult = {
  payload: PlaybackStatePayload;
  broadcastEvent: 'playback:play' | 'playback:change-track';
};

export class PlaybackService {
  private readonly playingRoomIds = new Set<string>();

  constructor(
    private readonly playbackRepo: IPlaybackRepository,
    private readonly roomRepo: PlaybackRoomRepo,
    private readonly playlistRepo: PlaybackPlaylistRepo,
    private readonly cache: ICache,
    private readonly youtubeClient: PlaybackYoutubeClient,
  ) {}

  initializeCache(roomId: string): void {
    this.cache.set(CacheKeys.playbackState(roomId), INITIAL_PLAYBACK_STATE_CACHE);
  }

  clearCache(roomId: string): void {
    this.cache.del(CacheKeys.playbackState(roomId));
    this.playingRoomIds.delete(roomId);
  }

  /** 현재 재생 중으로 추적 중인 Room ID의 스냅샷을 반환한다. */
  getPlayingRoomIds(): string[] {
    return Array.from(this.playingRoomIds);
  }

  /**
   * 서버 tick 타이머가 내부적으로 추적 중인 roomId만 조회한다.
   * 사용자 요청 경로가 아니므로 active member 권한 검증은 수행하지 않는다.
   */
  async getStateForTick(roomId: string): Promise<PlaybackStatePayload> {
    const cached = await this.readCurrentState(roomId);
    return this.toPlaybackStatePayload(cached);
  }

  async getPlaybackStateForSocket(roomId: string, userId: string): Promise<PlaybackStatePayload> {
    await assertActiveRoomMember(this.roomRepo, roomId, userId);

    const cached = await this.readCurrentState(roomId);
    return this.toPlaybackStatePayload(cached);
  }

  async getPlaybackStateForJoin(roomId: string): Promise<PlaybackStateResult> {
    const record = await this.playbackRepo.findByRoomId(roomId);
    if (!record) {
      throw new AppError(
        500,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        'PlaybackState를 찾을 수 없습니다.',
      );
    }

    return this.toPlaybackStateResult(record);
  }

  getPlaybackState(roomId: string): Promise<PlaybackStateRecord | null> {
    return this.playbackRepo.findByRoomId(roomId);
  }

  async play(roomId: string, userId: string, currentTime: number): Promise<PlaybackPlayResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);

    const current = await this.readCurrentState(roomId);
    if (current.videoId === null) {
      const playlist = await this.playlistRepo.getPlaylist(roomId);
      const firstAvailable = playlist.find((item) => item.status === 'available');
      if (!firstAvailable) {
        throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '재생할 곡이 없습니다.');
      }

      const payload = await this.changeTrack(roomId, userId, firstAvailable.id);
      return { payload, broadcastEvent: 'playback:change-track' };
    }

    await this.roomRepo.touchLastActivity(roomId);
    const payload = await this.applyStateUpdate(roomId, {
      videoId: current.videoId,
      playlistItemId: current.playlistItemId,
      baseCurrentTime: currentTime,
      isPlaying: true,
      serverStartedAt: new Date(),
      serverPausedAt: null,
    });

    return { payload, broadcastEvent: 'playback:play' };
  }

  async pause(roomId: string, userId: string, currentTime: number): Promise<PlaybackStatePayload> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    await this.roomRepo.touchLastActivity(roomId);

    const current = await this.readCurrentState(roomId);
    return this.applyStateUpdate(roomId, {
      videoId: current.videoId,
      playlistItemId: current.playlistItemId,
      baseCurrentTime: currentTime,
      isPlaying: false,
      serverStartedAt: null,
      serverPausedAt: new Date(),
    });
  }

  async seek(roomId: string, userId: string, seekTime: number): Promise<PlaybackStatePayload> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    await this.roomRepo.touchLastActivity(roomId);

    const current = await this.readCurrentState(roomId);
    const now = new Date();
    return this.applyStateUpdate(roomId, {
      videoId: current.videoId,
      playlistItemId: current.playlistItemId,
      baseCurrentTime: seekTime,
      isPlaying: current.isPlaying,
      serverStartedAt: current.isPlaying ? now : null,
      serverPausedAt: current.isPlaying ? null : now,
    });
  }

  async changeTrack(
    roomId: string,
    userId: string,
    playlistItemId: string,
  ): Promise<PlaybackStatePayload> {
    await assertRoomHost(this.roomRepo, roomId, userId);

    const item = await this.playlistRepo.findItemById(playlistItemId);
    if (item?.roomId !== roomId || item.status !== 'available') {
      throw new AppError(404, ERROR_CODES.PLAYLIST_ITEM_NOT_FOUND, '항목을 찾을 수 없습니다.');
    }

    await this.roomRepo.touchLastActivity(roomId);
    return this.applyStateUpdate(roomId, {
      videoId: item.videoId,
      playlistItemId: item.id,
      baseCurrentTime: 0,
      isPlaying: true,
      serverStartedAt: new Date(),
      serverPausedAt: null,
    });
  }

  async reportError(
    roomId: string,
    userId: string,
    videoId: string,
    errorCode: number,
  ): Promise<PlaybackErrorResult> {
    await assertRoomHost(this.roomRepo, roomId, userId);
    const errorPayload = { videoId, errorCode };

    const current = await this.readCurrentState(roomId);
    if (current.videoId !== videoId || current.playlistItemId === null) {
      return { errorPayload, playlist: null };
    }

    let videoExists = true;
    try {
      const [video] = await this.youtubeClient.getVideoDetails([videoId]);
      videoExists = Boolean(video);
    } catch {
      return { errorPayload, playlist: null };
    }

    if (videoExists) {
      return { errorPayload, playlist: null };
    }

    await this.playlistRepo.markUnavailable(current.playlistItemId);
    const items = await this.playlistRepo.getPlaylist(roomId);
    return { errorPayload, playlist: items.map(toPlaylistItem) };
  }

  setTrack(roomId: string, videoId: string, playlistItemId: string): Promise<PlaybackStatePayload> {
    return this.applyStateUpdate(roomId, {
      videoId,
      playlistItemId,
      baseCurrentTime: 0,
      isPlaying: true,
      serverStartedAt: new Date(),
      serverPausedAt: null,
    });
  }

  resetPlayback(roomId: string): Promise<PlaybackStatePayload> {
    return this.applyStateUpdate(roomId, {
      videoId: null,
      playlistItemId: null,
      baseCurrentTime: 0,
      isPlaying: false,
      serverStartedAt: null,
      serverPausedAt: new Date(),
    });
  }

  private async readCurrentState(roomId: string): Promise<PlaybackStateCache> {
    const cached = this.cache.get<PlaybackStateCache>(CacheKeys.playbackState(roomId));
    if (cached) return cached;

    const record = await this.playbackRepo.findByRoomId(roomId);
    if (!record) {
      throw new AppError(
        500,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        'PlaybackState를 찾을 수 없습니다.',
      );
    }

    const cacheValue = this.toCache(record);
    this.cache.set(CacheKeys.playbackState(roomId), cacheValue);
    return cacheValue;
  }

  private async applyStateUpdate(
    roomId: string,
    data: PlaybackStateUpdateData,
  ): Promise<PlaybackStatePayload> {
    const record = await this.playbackRepo.updateState(roomId, data);
    const cacheValue = this.toCache(record);
    this.cache.set(CacheKeys.playbackState(roomId), cacheValue);

    if (data.isPlaying) {
      this.playingRoomIds.add(roomId);
    } else {
      this.playingRoomIds.delete(roomId);
    }

    return this.toPlaybackStatePayload(cacheValue);
  }

  private toCache(record: PlaybackStateRecord): PlaybackStateCache {
    return {
      videoId: record.videoId,
      playlistItemId: record.playlistItemId,
      baseCurrentTime: record.baseCurrentTime,
      isPlaying: record.isPlaying,
      serverStartedAt: record.serverStartedAt?.toISOString() ?? null,
      serverPausedAt: record.serverPausedAt?.toISOString() ?? null,
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
