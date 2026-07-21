export const CacheKeys = {
  /**
   * Host 타이머 상태. TTL: 60초.
   * 값: HostCloseTimerState - 인메모리 전용 (NodeJS.Timeout 직렬화 불가).
   */
  hostTimer: (roomId: string) => `host-timer:${roomId}`,

  /**
   * 일반 참여자(Host 포함) disconnect 유예 타이머. TTL 없음(수동 정리).
   * 값: NodeJS.Timeout 참조 - 인메모리 전용 (NodeJS.Timeout 직렬화 불가).
   */
  memberOfflineTimer: (roomId: string, userId: string) =>
    `member-offline-timer:${roomId}:${userId}`,

  /** YouTube 검색 결과. TTL: 300초 (5분) */
  ytSearch: (query: string) => `yt-search:${query}`,

  /**
   * PlaybackSession 캐시. TTL 없음.
   * 값: 재생 상태·정책·셔플 큐·재생 이력을 함께 저장하며 방 종료 시 del.
   */
  playbackState: (roomId: string) => `playback:${roomId}`,
} as const;

/** 캐시 TTL 상수 (초 단위) */
export const CacheTTL = {
  HOST_TIMER: 60,
  YT_SEARCH: 300,
} as const;
