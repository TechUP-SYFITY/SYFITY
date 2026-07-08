// YouTubePlayer가 로컬 볼륨 store 변경을 IFrame Player API에 반영하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('YouTubePlayer', () => {
  beforeEach(() => {
    usePlayerVolumeStore.setState({
      isMuted: false,
      previousVolume: 70,
      volume: 70,
    });
    players.length = 0;

    vi.stubGlobal('YT', {
      Player: vi.fn(function createMockPlayer(_element: HTMLElement, options: YT.PlayerOptions) {
        const player: MockPlayer = {
          cueVideoById: vi.fn(),
          destroy: vi.fn(),
          getCurrentTime: vi.fn(() => 0),
          loadVideoById: vi.fn(),
          mute: vi.fn(),
          pauseVideo: vi.fn(),
          playVideo: vi.fn(),
          seekTo: vi.fn(),
          setVolume: vi.fn(),
          unMute: vi.fn(),
        };

        players.push(player);
        options.events?.onReady?.({ target: player as unknown as YT.Player });

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
});
