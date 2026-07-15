// Player 제어 훅이 MiniPlayer에서 사용하는 이전 곡 명령까지 실행하는지 검증한다.
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { usePlayerControls } from './usePlayerControls';
import { playbackCommands } from '../lib/playbackCommands';
import { usePlayerStore } from '../store/playerStore';

vi.mock('../lib/playbackCommands', () => ({
  playbackCommands: {
    changeTrack: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    requestSync: vi.fn(),
    seek: vi.fn(),
  },
}));

const roomId = 'room-1';

describe('usePlayerControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.getState().clearPlayback();
    vi.mocked(playbackCommands.changeTrack).mockResolvedValue(undefined);
    vi.mocked(playbackCommands.pause).mockResolvedValue(undefined);
    vi.mocked(playbackCommands.play).mockResolvedValue(undefined);
    vi.mocked(playbackCommands.seek).mockResolvedValue(undefined);
  });

  afterEach(() => {
    usePlayerStore.getState().clearPlayback();
    vi.useRealTimers();
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

  it('Host가 재생 위치를 변경하면 seek 명령을 보낸다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSeek(90);
    });

    expect(playbackCommands.seek).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(playbackCommands.seek).toHaveBeenCalledWith(roomId, 90);
    });
  });

  it('Host가 재생 위치를 연속 변경하면 마지막 위치만 전송한다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSeek(30);
      result.current.handleSeek(60);
      result.current.handleSeek(90);
    });

    await waitFor(() => {
      expect(playbackCommands.seek).toHaveBeenCalledTimes(1);
      expect(playbackCommands.seek).toHaveBeenCalledWith(roomId, 90);
    });
  });

  it('Member가 재생 위치를 변경해도 seek 명령을 보내지 않는다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSeek(90);
    });

    await waitFor(() => {
      expect(playbackCommands.seek).not.toHaveBeenCalled();
    });
  });

  it('재생 가능한 곡이 없으면 play 명령을 보내지 않는다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: false,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlayPause();
    });

    await waitFor(() => {
      expect(playbackCommands.play).not.toHaveBeenCalled();
    });
  });

  it('Host의 재생 탭에서 서버 명령 전에 로컬 플레이어를 즉시 재생한다', async () => {
    const callOrder: string[] = [];
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(() => callOrder.push('local-play')),
      },
    };
    vi.mocked(playbackCommands.play).mockImplementation(async () => {
      callOrder.push('socket-play');
    });
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlayPause();
    });

    expect(callOrder).toEqual(['local-play', 'socket-play']);
    expect(playerControllerRef.current.play).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(playbackCommands.play).toHaveBeenCalledWith(roomId, 12);
    });
  });

  it('Host의 이전 곡 탭에서 서버 명령 전에 로컬 플레이어를 즉시 재생한다', async () => {
    const callOrder: string[] = [];
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(() => callOrder.push('local-play')),
      },
    };
    vi.mocked(playbackCommands.changeTrack).mockImplementation(async () => {
      callOrder.push('socket-change-track');
    });
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        playerControllerRef,
        previousItemId: 'playlist-item-0',
        roomId,
      }),
    );

    act(() => {
      result.current.handlePreviousTrack();
    });

    expect(callOrder).toEqual(['local-play', 'socket-change-track']);
    expect(playerControllerRef.current.play).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-0');
    });
  });

  it('Host의 다음 곡 탭에서 서버 명령 전에 로컬 플레이어를 즉시 재생한다', async () => {
    const callOrder: string[] = [];
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(() => callOrder.push('local-play')),
      },
    };
    vi.mocked(playbackCommands.changeTrack).mockImplementation(async () => {
      callOrder.push('socket-change-track');
    });
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        nextItemId: 'playlist-item-2',
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handleNextTrack();
    });

    expect(callOrder).toEqual(['local-play', 'socket-change-track']);
    expect(playerControllerRef.current.play).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-2');
    });
  });

  it('낙관적 재생 명령이 실패하면 로컬 플레이어를 다시 일시정지한다', async () => {
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(),
      },
    };
    vi.mocked(playbackCommands.play).mockRejectedValue(new Error('Socket is not connected.'));
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlayPause();
    });

    await waitFor(() => {
      expect(playerControllerRef.current.pause).toHaveBeenCalledOnce();
    });
  });

  it('Socket ack 오류를 공통 사용자 메시지로 표시한다', async () => {
    vi.mocked(playbackCommands.play).mockRejectedValue(
      new ApiClientError({ code: 'AUTH_FORBIDDEN', message: '권한이 없습니다.' }),
    );
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlayPause();
    });

    await waitFor(() => {
      expect(result.current.commandError).toBe('Host만 재생을 제어할 수 있어요.');
    });
  });

  it('재생 가능한 곡이 없으면 next 명령을 보내지 않는다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: false,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleNextTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.pause).not.toHaveBeenCalled();
      expect(playbackCommands.changeTrack).not.toHaveBeenCalled();
    });
  });

  it('Host가 다음 곡을 요청하면 nextItemId로 곡 변경 명령을 보낸다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        nextItemId: 'playlist-item-2',
        roomId,
      }),
    );

    act(() => {
      result.current.handleNextTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-2');
    });
  });

  it('Host의 마지막 곡이 종료되면 0초 pause 명령을 보낸다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: true,
        roomId,
      }),
    );

    act(() => {
      result.current.handleNextTrack();
    });

    await waitFor(() => {
      expect(playbackCommands.pause).toHaveBeenCalledWith(roomId, 0);
    });
  });

  it('Host의 IFrame 재생 상태 변경을 공통 pending 명령으로 실행한다', async () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: true,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlaybackStateChange(false, 42);
    });

    await waitFor(() => {
      expect(playbackCommands.pause).toHaveBeenCalledWith(roomId, 42);
    });
  });

  it('Member의 IFrame 재생 상태 변경은 서버 동기화를 요청한다', () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: true,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlaybackStateChange(false, 42);
    });

    expect(playbackCommands.pause).not.toHaveBeenCalled();
    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(usePlayerStore.getState().playbackSyncStatus).toBe('pending');
  });

  it('Host 역할이지만 Room 제어가 잠기면 재생 명령과 Member 동기화 요청을 보내지 않는다', () => {
    const { result } = renderHook(() =>
      usePlayerControls({
        canControlRoom: false,
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlaybackStateChange(true, 42);
    });

    expect(result.current.controlDisabled).toBe(true);
    expect(playbackCommands.play).not.toHaveBeenCalled();
    expect(playbackCommands.requestSync).not.toHaveBeenCalled();
  });

  it('Member 동기화 요청 실패 시 피드백 상태를 초기화한다', () => {
    vi.mocked(playbackCommands.requestSync).mockImplementation(() => {
      throw new Error('Socket is not connected.');
    });
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: true,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlaybackStateChange(false, 42);
    });

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
  });

  it('다른 명령이 pending이면 IFrame 재생 상태 명령을 보내지 않는다', async () => {
    const nextCommand = createDeferred<void>();
    vi.mocked(playbackCommands.changeTrack).mockReturnValue(nextCommand.promise);
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        nextItemId: 'playlist-item-2',
        roomId,
      }),
    );

    act(() => {
      result.current.handleNextTrack();
    });

    await waitFor(() => {
      expect(result.current.pendingCommand).toBe('next');
    });

    act(() => {
      result.current.handlePlaybackStateChange(true, 42);
    });

    expect(playbackCommands.play).not.toHaveBeenCalled();

    act(() => {
      nextCommand.resolve();
    });
  });

  it('seek 디바운스 중 다른 명령이 시작되면 예약된 seek를 취소한다', async () => {
    vi.useFakeTimers();
    const nextCommand = createDeferred<void>();
    vi.mocked(playbackCommands.changeTrack).mockReturnValue(nextCommand.promise);
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        nextItemId: 'playlist-item-2',
        roomId,
      }),
    );

    act(() => {
      result.current.handleSeek(90);
      result.current.handleNextTrack();
      vi.advanceTimersByTime(200);
    });

    expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-2');
    expect(playbackCommands.seek).not.toHaveBeenCalled();

    await act(async () => {
      nextCommand.resolve();
      await nextCommand.promise;
    });
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
