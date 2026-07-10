// Player 제어 훅이 MiniPlayer에서 사용하는 이전 곡 명령까지 실행하는지 검증한다.
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { playbackCommands } from './playbackCommands';
import { usePlayerControls } from './usePlayerControls';

vi.mock('./playbackCommands', () => ({
  playbackCommands: {
    changeTrack: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    requestSync: vi.fn(),
  },
}));

const roomId = 'room-1';

describe('usePlayerControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playbackCommands.changeTrack).mockResolvedValue(undefined);
  });

  it('Host가 이전 곡을 요청하면 previousItemId로 곡 변경 명령을 보낸다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        previousItemId: 'playlist-item-0',
        roomId,
      }),
    );

    act(() => {
      result.current.handlePreviousTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-0');
    });
  });

  it('Member가 이전 곡을 요청하면 곡 변경 명령을 보내지 않는다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: false,
        previousItemId: 'playlist-item-0',
        roomId,
      }),
    );

    act(() => {
      result.current.handlePreviousTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.changeTrack).not.toHaveBeenCalled();
    });
  });

  it('재생 가능한 곡이 없으면 이전 곡 명령을 보내지 않는다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: false,
        isHost: true,
        isPlaying: false,
        previousItemId: 'playlist-item-0',
        roomId,
      }),
    );

    act(() => {
      result.current.handlePreviousTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.changeTrack).not.toHaveBeenCalled();
    });
  });
});
