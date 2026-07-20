// Playback Socket 이벤트 구독과 정리 범위를 검증한다.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SyfitySocket } from '@/shared/lib/socket/types';
import type { PlaybackState } from '@/shared/types/domain';

import { usePlaybackSocket } from './usePlaybackSocket';
import { usePlayerStore } from '../store/playerStore';

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: vi.fn(),
  },
}));

type Listener = (...args: unknown[]) => void;

const listeners = new Map<string, Listener>();
const socket = {
  disconnect: vi.fn(),
  emit: vi.fn(),
  off: vi.fn((event: string, listener?: Listener) => {
    if (!listener || listeners.get(event) === listener) {
      listeners.delete(event);
    }
  }),
  on: vi.fn((event: string, listener: Listener) => {
    listeners.set(event, listener);
  }),
} as unknown as SyfitySocket;

const playbackState: PlaybackState = {
  currentTime: 24,
  isPlaying: true,
  playbackVersion: 1,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

describe('usePlaybackSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    usePlayerStore.getState().clearPlayback();
    vi.mocked(socketClient.connect).mockReturnValue(socket);
  });

  afterEach(() => {
    usePlayerStore.getState().clearPlayback();
  });

  it('playback:tick을 서버 주기 보정 상태로 저장한다', () => {
    renderHook(() => usePlaybackSocket(true));

    act(() => {
      listeners.get('playback:tick')?.(playbackState);
    });

    expect(usePlayerStore.getState()).toMatchObject({
      lastEventSource: 'tick',
      playbackState,
    });
  });

  it('playback:sync-response를 명시적 동기화 응답 상태로 저장한다', () => {
    renderHook(() => usePlaybackSocket(true));

    act(() => {
      usePlayerStore.getState().beginPlaybackSync();
      listeners.get('playback:sync-response')?.(playbackState);
    });

    expect(usePlayerStore.getState()).toMatchObject({
      lastEventSource: 'sync-response',
      playbackState,
      playbackSyncStatus: 'synced',
    });
  });

  it('unmount 시 자신이 등록한 listener만 같은 참조로 해제한다', () => {
    const { unmount } = renderHook(() => usePlaybackSocket(true));
    const tickListener = listeners.get('playback:tick');
    const syncResponseListener = listeners.get('playback:sync-response');

    unmount();

    expect(socket.off).toHaveBeenCalledWith('playback:tick', tickListener);
    expect(socket.off).toHaveBeenCalledWith('playback:sync-response', syncResponseListener);
  });
});
