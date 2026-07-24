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
    updateSettings: vi.fn(),
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
    vi.mocked(playbackCommands.updateSettings).mockResolvedValue(undefined);
  });

  afterEach(() => {
    usePlayerStore.getState().clearPlayback();
    vi.useRealTimers();
  });

  it('Host가 이전 곡을 요청하면 action 기반 곡 변경 명령을 보낸다', async () => {
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
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'previous');
    });
  });

  it('반복과 셔플 토글을 현재 정책 기준으로 서버에 요청한다', async () => {
    usePlayerStore.getState().setPlaybackPolicy({ repeatMode: 'all', shuffleEnabled: false });
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleRepeatToggle();
    });
    await waitFor(() => {
      expect(playbackCommands.updateSettings).toHaveBeenCalledWith(roomId, { repeatMode: 'one' });
    });

    act(() => {
      result.current.handleShuffleToggle();
    });
    await waitFor(() => {
      expect(playbackCommands.updateSettings).toHaveBeenCalledWith(roomId, {
        shuffleEnabled: true,
      });
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
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'previous');
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
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'next');
    });
  });

  it('Host의 Playlist 곡 선택은 서버 명령 전에 로컬 플레이어를 재생하고 item id를 전달한다', async () => {
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
        currentTime: 0,
        hasPlayableTrack: false,
        isHost: true,
        isPlaying: false,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSelectTrack('playlist-item-2');
    });

    expect(callOrder).toEqual(['local-play', 'socket-change-track']);
    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(
        roomId,
        'select',
        'playlist-item-2',
      );
    });
  });

  it('Member의 Playlist 곡 선택은 로컬 재생과 서버 명령을 실행하지 않는다', () => {
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(),
      },
    };
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: false,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSelectTrack('playlist-item-2');
    });

    expect(playerControllerRef.current.play).not.toHaveBeenCalled();
    expect(playbackCommands.changeTrack).not.toHaveBeenCalled();
  });

  it('Playlist 곡 선택 명령이 pending이면 중복 선택을 보내지 않는다', async () => {
    const selectCommand = createDeferred<void>();
    vi.mocked(playbackCommands.changeTrack).mockReturnValue(selectCommand.promise);
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSelectTrack('playlist-item-2');
      result.current.handleSelectTrack('playlist-item-2');
    });

    expect(playbackCommands.changeTrack).toHaveBeenCalledOnce();
    expect(result.current.pendingCommand).toBe('select');

    await act(async () => {
      selectCommand.resolve();
      await selectCommand.promise;
    });
  });

  it('Playlist 곡 선택 실패를 공통 Player 오류로 표시하고 pending을 해제한다', async () => {
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(),
      },
    };
    vi.mocked(playbackCommands.changeTrack).mockRejectedValue(
      new ApiClientError({
        code: 'PLAYLIST_ITEM_NOT_FOUND',
        message: '재생목록 항목이 없습니다.',
      }),
    );
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 0,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: false,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSelectTrack('missing-item');
    });

    await waitFor(() => {
      expect(result.current.commandError).toBe('재생할 곡을 찾을 수 없어요.');
      expect(result.current.pendingCommand).toBeNull();
    });
    expect(playerControllerRef.current.play).toHaveBeenCalledOnce();
    expect(playerControllerRef.current.pause).toHaveBeenCalledOnce();
  });

  it('재생 중인 곡에서 Playlist 선택이 실패하면 로컬 플레이어를 일시정지하지 않는다', async () => {
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(),
      },
    };
    vi.mocked(playbackCommands.changeTrack).mockRejectedValue(
      new ApiClientError({
        code: 'PLAYLIST_ITEM_NOT_FOUND',
        message: '재생목록 항목이 없습니다.',
      }),
    );
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: true,
        isPlaying: true,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handleSelectTrack('missing-item');
    });

    await waitFor(() => {
      expect(result.current.pendingCommand).toBeNull();
    });
    expect(playerControllerRef.current.play).toHaveBeenCalledOnce();
    expect(playerControllerRef.current.pause).not.toHaveBeenCalled();
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

  it('Host가 다음 곡을 요청하면 action 기반 곡 변경 명령을 보낸다', async () => {
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
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'next');
    });
  });

  it('Host의 다음 곡 요청은 마지막 곡 여부도 서버에 위임한다', async () => {
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
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'next');
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
    expect(usePlayerStore.getState().playbackSyncSource).toBe('auto');
  });

  it('Member가 재생을 중지하면 로컬 Player만 일시정지한다', () => {
    const playerControllerRef = {
      current: {
        pause: vi.fn(),
        play: vi.fn(),
      },
    };
    const { result } = renderHook(() =>
      usePlayerControls({
        currentTime: 12,
        hasPlayableTrack: true,
        isHost: false,
        isPlaying: true,
        playerControllerRef,
        roomId,
      }),
    );

    act(() => {
      result.current.handlePlayPause();
    });

    expect(playerControllerRef.current.pause).toHaveBeenCalledOnce();
    expect(playbackCommands.pause).not.toHaveBeenCalled();
    expect(usePlayerStore.getState().isLocalSyncPaused).toBe(true);
  });

  it('로컬 동기화를 중지한 Member가 재생하면 수동 동기화를 요청한다', () => {
    usePlayerStore.getState().pauseLocalSync();
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
      result.current.handlePlayPause();
    });

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(usePlayerStore.getState()).toMatchObject({
      isLocalSyncPaused: false,
      playbackSyncSource: 'manual',
      playbackSyncStatus: 'pending',
    });
  });

  it('Member의 수동 동기화 요청 실패 시 중지 상태와 오류 피드백을 유지한다', () => {
    usePlayerStore.getState().pauseLocalSync();
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
      result.current.handlePlayPause();
    });

    expect(usePlayerStore.getState()).toMatchObject({
      isLocalSyncPaused: true,
      playbackSyncSource: 'manual',
      playbackSyncStatus: 'error',
    });
  });

  it('로컬 동기화가 중지된 Member의 IFrame 상태 변경은 무시한다', () => {
    usePlayerStore.getState().pauseLocalSync();
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

    expect(playbackCommands.requestSync).not.toHaveBeenCalled();
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

    expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'next');
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
