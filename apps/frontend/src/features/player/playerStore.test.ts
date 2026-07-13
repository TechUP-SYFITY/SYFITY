// Player store의 서버 재생 상태와 로컬 재생 위치 병합 규칙을 검증한다.
import { afterEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from './playerStore';
import type { PlayerPlaybackState } from './playerTypes';

const playbackState: PlayerPlaybackState = {
  currentTime: 10,
  isPlaying: true,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

describe('usePlayerStore', () => {
  afterEach(() => {
    usePlayerStore.getState().clearPlayback();
  });

  it('같은 영상의 tick 수신 시 로컬 재생 위치를 유지한다', () => {
    usePlayerStore.getState().setLocalPlaybackPosition('video-1', 12);
    usePlayerStore.getState().setPlaybackState(playbackState, 'tick');

    expect(usePlayerStore.getState().localPlaybackPosition).toEqual({
      currentTime: 12,
      videoId: 'video-1',
    });
  });

  it('명시적 재생 이벤트 수신 시 로컬 재생 위치를 초기화한다', () => {
    usePlayerStore.getState().setLocalPlaybackPosition('video-1', 12);
    usePlayerStore.getState().setPlaybackState(playbackState, 'seek');

    expect(usePlayerStore.getState().localPlaybackPosition).toBeNull();
  });

  it('다른 영상의 tick 수신 시 로컬 재생 위치를 초기화한다', () => {
    usePlayerStore.getState().setLocalPlaybackPosition('video-1', 12);
    usePlayerStore.getState().setPlaybackState(
      {
        ...playbackState,
        playlistItemId: 'playlist-item-2',
        videoId: 'video-2',
      },
      'tick',
    );

    expect(usePlayerStore.getState().localPlaybackPosition).toBeNull();
  });
});
