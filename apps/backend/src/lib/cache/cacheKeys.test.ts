import { describe, expect, it } from 'vitest';

import { CacheKeys, CacheTTL } from './cacheKeys';

describe('CacheKeys', () => {
  it('host timer 캐시 키를 생성한다', () => {
    expect(CacheKeys.hostTimer('room-1')).toBe('host-timer:room-1');
  });

  it('playback state 캐시 키를 생성한다', () => {
    expect(CacheKeys.playbackState('room-1')).toBe('playback:room-1');
  });

  it('YouTube 검색 결과 캐시 키를 생성한다', () => {
    expect(CacheKeys.ytSearch('로파이')).toBe('yt-search:로파이');
  });

  it('presence 캐시 키를 생성한다', () => {
    expect(CacheKeys.presence('room-1')).toBe('presence:room-1');
  });
});

describe('CacheTTL', () => {
  it('host timer TTL을 초 단위로 제공한다', () => {
    expect(CacheTTL.HOST_TIMER).toBe(60);
  });

  it('YouTube 검색 결과 TTL을 초 단위로 제공한다', () => {
    expect(CacheTTL.YT_SEARCH).toBe(300);
  });
});
