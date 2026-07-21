import type { PlaybackSession } from '../../types/playback';
import type { ICache } from '../cache/cache.interface';
import { CacheKeys } from '../cache/cacheKeys';

export function createDefaultPlaybackSession(): PlaybackSession {
  return {
    videoId: null,
    playlistItemId: null,
    baseCurrentTime: 0,
    isPlaying: false,
    serverStartedAt: null,
    serverPausedAt: null,
    playbackVersion: 0,
    repeatMode: 'off',
    shuffleEnabled: false,
    shuffleCycle: 0,
    remainingPlaylistItemIds: [],
    playbackHistoryItemIds: [],
  };
}

export class PlaybackSessionStore {
  constructor(private readonly cache: ICache) {}

  get(roomId: string): PlaybackSession {
    return (
      this.cache.get<PlaybackSession>(CacheKeys.playbackState(roomId)) ??
      createDefaultPlaybackSession()
    );
  }

  set(roomId: string, session: PlaybackSession): void {
    this.cache.set(CacheKeys.playbackState(roomId), session, 0);
  }

  clear(roomId: string): void {
    this.cache.del(CacheKeys.playbackState(roomId));
  }
}
