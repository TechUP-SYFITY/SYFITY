export const CacheKeys = {
  /**
   * Host 타이머 상태. TTL: 60초.
   * 값: NodeJS.Timeout 참조 - 인메모리 전용 (NodeJS.Timeout 직렬화 불가).
   */
  hostTimer: (roomId: string) => `host-timer:${roomId}`,

  /** YouTube 검색 결과. TTL: 300초 (5분) */
  ytSearch: (query: string) => `yt-search:${query}`,

  /**
   * Room 참여자 온라인 상태. TTL 없음.
   * 값: Record<userId, 'online' | 'offline'>. Socket 이벤트로 갱신, 방 종료 시 del.
   */
  presence: (roomId: string) => `presence:${roomId}`,

  /**
   * PlaybackState 캐시. TTL 없음.
   * 값: PlaybackStateCache. play/pause/seek/next 이벤트로 갱신, 방 종료 시 del.
   */
  playbackState: (roomId: string) => `playback:${roomId}`,
} as const;

/** 캐시 TTL 상수 (초 단위) */
export const CacheTTL = {
  HOST_TIMER: 60,
  YT_SEARCH: 300,
} as const;
