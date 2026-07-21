import { describe, expect, it, vi } from 'vitest';

import { PlaybackSessionStore, createDefaultPlaybackSession } from './playback-session.store';
import type { ICache } from '../cache/cache.interface';

describe('PlaybackSessionStore', () => {
  it('cache miss에는 기본 재생 세션을 반환하고 Room 키에 저장한다', () => {
    const cache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn(), has: vi.fn() };
    const store = new PlaybackSessionStore(cache);
    expect(store.get('room-1')).toEqual(createDefaultPlaybackSession());
    store.set('room-1', createDefaultPlaybackSession());
    expect(cache.set).toHaveBeenCalledWith('playback:room-1', createDefaultPlaybackSession(), 0);
    store.clear('room-1');
    expect(cache.del).toHaveBeenCalledWith('playback:room-1');
  });
});
