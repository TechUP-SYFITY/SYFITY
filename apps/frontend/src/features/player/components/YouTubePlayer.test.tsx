// YouTubePlayer가 로컬 볼륨 store 변경을 IFrame Player API에 반영하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculatePlayerFrameSize, YouTubePlayer } from './YouTubePlayer';
import { usePlayerStore } from '../store/playerStore';
import { usePlayerVolumeStore } from '../store/playerVolumeStore';
import type { PlayerPlaybackState } from '../types/playerTypes';

interface MockPlayer {
  cueVideoById: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  loadVideoById: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  pauseVideo: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  unMute: ReturnType<typeof vi.fn>;
}

const playbackState: PlayerPlaybackState = {
  currentTime: 0,
  isPlaying: false,
  playbackVersion: 0,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

const players: MockPlayer[] = [];
let deferPlayerReady = false;
let mockCurrentTime = 0;
let playerOptions: YT.PlayerOptions | null = null;

describe('YouTubePlayer', () => {
  beforeEach(() => {
    usePlayerVolumeStore.setState({
      isMuted: false,
      previousVolume: 70,
      volume: 70,
    });
    usePlayerStore.getState().clearPlayback();
    deferPlayerReady = false;
    mockCurrentTime = 0;
    playerOptions = null;
    players.length = 0;

    vi.stubGlobal('YT', {
      Player: vi.fn(function createMockPlayer(_element: HTMLElement, options: YT.PlayerOptions) {
        const player: MockPlayer = {
          cueVideoById: vi.fn(),
          destroy: vi.fn(),
          getCurrentTime: vi.fn(() => mockCurrentTime),
          loadVideoById: vi.fn(),
          mute: vi.fn(),
          pauseVideo: vi.fn(),
          playVideo: vi.fn(),
          seekTo: vi.fn(),
          setVolume: vi.fn(),
          unMute: vi.fn(),
        };

        players.push(player);
        playerOptions = options;

        if (!deferPlayerReady) {
          options.events?.onReady?.({ target: player as unknown as YT.Player });
        }

        return player;
      }),
      PlayerState: {
        BUFFERING: 3,
        ENDED: 0,
        PAUSED: 2,
        PLAYING: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    usePlayerStore.getState().clearPlayback();
  });

  it('가용 폭·높이 중 더 좁은 축에 16:9 프레임을 맞춘다', () => {
    expect(calculatePlayerFrameSize(926, 300)).toEqual({ width: 533, height: 300 });
    expect(calculatePlayerFrameSize(800, 700)).toEqual({ width: 800, height: 450 });
  });

  it('16:9 계산 결과가 200px 미만이면 가용 너비를 넘어서라도 200×356으로 키운다', () => {
    // 311×9/16 ≈ 175px로, RMF 최소 크기(200×200)를 지키기 위해 강제로 키워야 한다.
    expect(calculatePlayerFrameSize(311, 518)).toEqual({ width: 356, height: 200 });
  });

  it('가용 공간이 아예 없으면(0 이하) 200×200 최소 크기를 반환한다', () => {
    expect(calculatePlayerFrameSize(0, 0)).toEqual({ width: 200, height: 200 });
    expect(calculatePlayerFrameSize(-10, 300)).toEqual({ width: 200, height: 200 });
  });

  it('player ready 시 현재 로컬 볼륨을 적용한다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]?.setVolume).toHaveBeenCalledWith(70);
    });
    expect(players[0]?.unMute).toHaveBeenCalled();
  });

  it('YouTube IFrame의 네이티브 재생 컨트롤을 숨긴다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(playerOptions?.playerVars?.controls).toBe(0);
    });
  });

  it('player ready 시 즉시 재생 제어기를 등록하고 unmount 시 해제한다', async () => {
    const playerControllerRef = { current: null as null | { pause(): void; play(): void } };
    const { unmount } = render(
      <YouTubePlayer
        playerControllerRef={playerControllerRef}
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(playerControllerRef.current).not.toBeNull();
    });
    playerControllerRef.current?.play();
    expect(players[0]?.playVideo).toHaveBeenCalledOnce();

    unmount();

    expect(playerControllerRef.current).toBeNull();
  });

  it('로컬 볼륨 변경을 YouTube Player에 반영한다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });

    act(() => {
      usePlayerVolumeStore.getState().setVolume(35);
    });

    await waitFor(() => {
      expect(players[0]?.setVolume).toHaveBeenCalledWith(35);
    });
    expect(players[0]?.unMute).toHaveBeenCalled();
  });

  it('음소거 상태를 YouTube Player mute 호출로 반영한다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });

    act(() => {
      usePlayerVolumeStore.getState().toggleMuted();
    });

    await waitFor(() => {
      expect(players[0]?.mute).toHaveBeenCalled();
    });
  });

  it('IFrame Player 현재 시간을 로컬 player store에 연결한다', async () => {
    mockCurrentTime = 42;

    render(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(
      () => {
        expect(usePlayerStore.getState().localPlaybackPosition).toEqual({
          currentTime: 42,
          videoId: 'video-1',
        });
      },
      { timeout: 1_500 },
    );
  });

  it('재생 중인 현재 시간을 1초보다 짧은 간격으로 다시 반영한다', async () => {
    vi.useFakeTimers();
    mockCurrentTime = 10;

    render(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(usePlayerStore.getState().localPlaybackPosition?.currentTime).toBe(10);
    mockCurrentTime = 11;

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(usePlayerStore.getState().localPlaybackPosition?.currentTime).toBe(10);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(usePlayerStore.getState().localPlaybackPosition?.currentTime).toBe(11);
  });

  it('일시정지 상태에서는 로컬 재생 위치를 주기적으로 갱신하지 않는다', async () => {
    mockCurrentTime = 42;

    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });
    expect(usePlayerStore.getState().localPlaybackPosition).toBeNull();
  });

  it('로컬 동기화가 중지되면 최신 서버 상태를 IFrame에 적용하지 않는다', async () => {
    const { rerender } = render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });
    usePlayerStore.getState().pauseLocalSync();

    rerender(
      <YouTubePlayer
        playbackState={{ ...playbackState, currentTime: 42, isPlaying: true, videoId: 'video-2' }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    expect(players[0]?.loadVideoById).not.toHaveBeenCalled();
    expect(players[0]?.seekTo).not.toHaveBeenCalled();
    expect(players[0]?.playVideo).not.toHaveBeenCalled();
  });

  it('로컬 동기화가 중지되면 재생 중이어도 현재 시간을 폴링하지 않는다', async () => {
    vi.useFakeTimers();
    mockCurrentTime = 42;
    usePlayerStore.getState().pauseLocalSync();

    render(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(usePlayerStore.getState().localPlaybackPosition).toBeNull();
  });

  it('player ready가 늦어져도 가장 최신 playbackState를 적용한다', async () => {
    deferPlayerReady = true;
    const nextPlaybackState: PlayerPlaybackState = {
      currentTime: 30,
      isPlaying: true,
      playbackVersion: 1,
      playlistItemId: 'playlist-item-2',
      videoId: 'video-2',
    };
    const { rerender } = render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });

    rerender(
      <YouTubePlayer
        playbackState={nextPlaybackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    expect(players).toHaveLength(1);
    expect(players[0]?.destroy).not.toHaveBeenCalled();

    act(() => {
      playerOptions?.events?.onReady?.({ target: players[0] as unknown as YT.Player });
    });

    expect(players[0]?.loadVideoById).toHaveBeenCalledWith({
      startSeconds: 30,
      videoId: 'video-2',
    });
  });

  it('이벤트 콜백이 변경돼도 IFrame Player를 재생성하지 않고 최신 콜백을 호출한다', async () => {
    const initialOnEnded = vi.fn();
    const latestOnEnded = vi.fn();
    const { rerender } = render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={initialOnEnded}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players).toHaveLength(1);
    });

    rerender(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={latestOnEnded}
        onError={vi.fn()}
        onPlaybackStateChange={vi.fn()}
      />,
    );

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.ENDED,
        target: players[0] as unknown as YT.Player,
      });
    });

    expect(players).toHaveLength(1);
    expect(players[0]?.destroy).not.toHaveBeenCalled();
    expect(initialOnEnded).not.toHaveBeenCalled();
    expect(latestOnEnded).toHaveBeenCalledOnce();
  });

  it('IFrame 재생 상태가 서버 상태와 달라지면 현재 위치와 상태를 전달한다', async () => {
    mockCurrentTime = 42;
    const onPlaybackStateChange = vi.fn();

    render(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={onPlaybackStateChange}
      />,
    );

    await waitFor(() => {
      expect(players).toHaveLength(1);
    });

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.PAUSED,
        target: players[0] as unknown as YT.Player,
      });
    });

    expect(onPlaybackStateChange).toHaveBeenCalledWith(false, 42);
  });

  it('재생 중 트랙을 전환하면 교체 과정의 일시적 PAUSED 이벤트를 서버에 동기화하지 않는다', async () => {
    const onPlaybackStateChange = vi.fn();

    const { rerender } = render(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={onPlaybackStateChange}
      />,
    );

    await waitFor(() => {
      expect(players).toHaveLength(1);
    });

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.PLAYING,
        target: players[0] as unknown as YT.Player,
      });
    });

    rerender(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true, videoId: 'video-2' }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={onPlaybackStateChange}
      />,
    );

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.PAUSED,
        target: players[0] as unknown as YT.Player,
      });
    });

    expect(onPlaybackStateChange).not.toHaveBeenCalled();
  });

  it('일시정지 상태에서 트랙을 전환한 뒤 발생한 PAUSED 이벤트는 그대로 동기화한다', async () => {
    mockCurrentTime = 5;
    const onPlaybackStateChange = vi.fn();

    const { rerender } = render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={onPlaybackStateChange}
      />,
    );

    await waitFor(() => {
      expect(players).toHaveLength(1);
    });

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.PAUSED,
        target: players[0] as unknown as YT.Player,
      });
    });

    rerender(
      <YouTubePlayer
        playbackState={{ ...playbackState, isPlaying: true, videoId: 'video-2' }}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
        onPlaybackStateChange={onPlaybackStateChange}
      />,
    );

    act(() => {
      playerOptions?.events?.onStateChange?.({
        data: window.YT.PlayerState.PAUSED,
        target: players[0] as unknown as YT.Player,
      });
    });

    expect(onPlaybackStateChange).toHaveBeenCalledWith(false, 5);
  });
});
