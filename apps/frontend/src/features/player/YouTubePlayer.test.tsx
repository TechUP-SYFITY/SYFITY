// YouTubePlayer가 로컬 볼륨 store 변경을 IFrame Player API에 반영하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerStore } from './playerStore';
import type { PlayerPlaybackState } from './playerTypes';
import { usePlayerVolumeStore } from './playerVolumeStore';
import { YouTubePlayer } from './YouTubePlayer';

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
        PLAYING: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    usePlayerStore.getState().clearPlayback();
  });

  it('player ready 시 현재 로컬 볼륨을 적용한다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]?.setVolume).toHaveBeenCalledWith(70);
    });
    expect(players[0]?.unMute).toHaveBeenCalled();
  });

  it('로컬 볼륨 변경을 YouTube Player에 반영한다', async () => {
    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
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

  it('일시정지 상태에서는 로컬 재생 위치를 주기적으로 갱신하지 않는다', async () => {
    mockCurrentTime = 42;

    render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(players[0]).toBeDefined();
    });
    expect(usePlayerStore.getState().localPlaybackPosition).toBeNull();
  });

  it('player ready가 늦어져도 가장 최신 playbackState를 적용한다', async () => {
    deferPlayerReady = true;
    const nextPlaybackState: PlayerPlaybackState = {
      currentTime: 30,
      isPlaying: true,
      playlistItemId: 'playlist-item-2',
      videoId: 'video-2',
    };
    const { rerender } = render(
      <YouTubePlayer
        playbackState={playbackState}
        onBufferingRecovered={vi.fn()}
        onEnded={vi.fn()}
        onError={vi.fn()}
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
      />,
    );

    act(() => {
      playerOptions?.events?.onReady?.({ target: players[0] as unknown as YT.Player });
    });

    expect(players[0]?.loadVideoById).toHaveBeenCalledWith({
      startSeconds: 30,
      videoId: 'video-2',
    });
  });
});
