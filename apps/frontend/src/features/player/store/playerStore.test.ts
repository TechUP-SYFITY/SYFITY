// Player store의 서버 재생 상태와 로컬 재생 위치 병합 규칙을 검증한다.
import { afterEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from './playerStore';
import type { PlayerPlaybackState } from '../types/playerTypes';

const playbackState: PlayerPlaybackState = {
  currentTime: 10,
  isPlaying: true,
  playbackVersion: 1,
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

  it('요청 중 sync-response를 수신하면 동기화 완료 상태로 전환한다', () => {
    usePlayerStore.getState().beginPlaybackSync();
    usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('synced');
  });

  it('playback:tick은 요청 중 동기화 피드백을 변경하지 않는다', () => {
    usePlayerStore.getState().beginPlaybackSync();
    usePlayerStore.getState().setPlaybackState(playbackState, 'tick');

    expect(usePlayerStore.getState()).toMatchObject({
      lastEventSource: 'tick',
      playbackSyncStatus: 'pending',
    });
  });

  it('요청하지 않은 sync-response는 완료 피드백을 만들지 않는다', () => {
    usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
  });

  it('로컬 동기화를 중지하고 재개한다', () => {
    usePlayerStore.getState().pauseLocalSync();

    expect(usePlayerStore.getState().isLocalSyncPaused).toBe(true);

    usePlayerStore.getState().resumeLocalSync();

    expect(usePlayerStore.getState().isLocalSyncPaused).toBe(false);
  });

  it('수동 동기화 요청 출처와 오류 상태를 보관한다', () => {
    usePlayerStore.getState().beginPlaybackSync('manual');

    expect(usePlayerStore.getState()).toMatchObject({
      playbackSyncSource: 'manual',
      playbackSyncStatus: 'pending',
    });

    usePlayerStore.getState().setPlaybackSyncError();

    expect(usePlayerStore.getState()).toMatchObject({
      playbackSyncSource: 'manual',
      playbackSyncStatus: 'error',
    });
  });

  it('인자 없는 동기화 요청은 자동 출처를 사용하고 초기화 시 출처를 지운다', () => {
    usePlayerStore.getState().beginPlaybackSync();

    expect(usePlayerStore.getState().playbackSyncSource).toBe('auto');

    usePlayerStore.getState().clearPlaybackSync();

    expect(usePlayerStore.getState()).toMatchObject({
      playbackSyncSource: null,
      playbackSyncStatus: 'idle',
    });
  });

  it('Room 재입장과 이탈 시 로컬 동기화 중지 상태를 초기화한다', () => {
    usePlayerStore.getState().pauseLocalSync();
    usePlayerStore.getState().setPlaybackState(playbackState, 'room-join');

    expect(usePlayerStore.getState().isLocalSyncPaused).toBe(false);

    usePlayerStore.getState().pauseLocalSync();
    usePlayerStore.getState().clearPlayback();

    expect(usePlayerStore.getState().isLocalSyncPaused).toBe(false);
  });

  it('반복·셔플 정책을 보관하고 reset 이벤트에서 로컬 동기화 중지를 해제한다', () => {
    usePlayerStore.getState().setPlaybackPolicy({ repeatMode: 'all', shuffleEnabled: true });
    expect(usePlayerStore.getState().playbackPolicy).toEqual({
      repeatMode: 'all',
      shuffleEnabled: true,
    });

    usePlayerStore.getState().pauseLocalSync();
    usePlayerStore.getState().setPlaybackState(playbackState, 'reset');
    expect(usePlayerStore.getState()).toMatchObject({
      isLocalSyncPaused: false,
      lastEventSource: 'reset',
    });
  });
});
