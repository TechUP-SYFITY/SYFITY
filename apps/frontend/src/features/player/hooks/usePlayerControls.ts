// Player 재생 제어 상태와 Socket 명령 실행을 관리한다.
import { useEffect, useRef, useState, type RefObject } from 'react';

import type { ErrorCode } from '@syfity/shared';

import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';

import { playbackCommands } from '../lib/playbackCommands';
import { usePlayerStore } from '../store/playerStore';
import type { PlayerController } from '../types/playerTypes';

export type PlayerCommand =
  'play' | 'pause' | 'previous' | 'next' | 'select' | 'seek' | 'repeat' | 'shuffle';

const SEEK_DEBOUNCE_MS = 200;
const PLAYER_COMMAND_ERROR_MESSAGE_OVERRIDES = {
  AUTH_FORBIDDEN: 'Host만 재생을 제어할 수 있어요.',
  PLAYLIST_ITEM_NOT_FOUND: '재생할 곡을 찾을 수 없어요.',
} satisfies Partial<Record<ErrorCode, string>>;

interface UsePlayerControlsParams {
  canControlRoom?: boolean;
  roomId: string;
  isHost: boolean;
  currentTime: number;
  hasPlayableTrack: boolean;
  isPlaying: boolean;
  playerControllerRef?: RefObject<PlayerController | null>;
  /** @deprecated next/previous selection is server-authoritative. */
  nextItemId?: string;
  /** @deprecated next/previous selection is server-authoritative. */
  previousItemId?: string;
}

export function usePlayerControls({
  roomId,
  isHost,
  canControlRoom = isHost,
  currentTime,
  hasPlayableTrack,
  isPlaying,
  playerControllerRef,
}: UsePlayerControlsParams) {
  const seekTimeoutRef = useRef<number | null>(null);
  const pendingCommandRef = useRef<PlayerCommand | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PlayerCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const beginPlaybackSync = usePlayerStore((state) => state.beginPlaybackSync);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const isLocalSyncPaused = usePlayerStore((state) => state.isLocalSyncPaused);
  const pauseLocalSync = usePlayerStore((state) => state.pauseLocalSync);
  const resumeLocalSync = usePlayerStore((state) => state.resumeLocalSync);
  const setPlaybackSyncError = usePlayerStore((state) => state.setPlaybackSyncError);
  const playbackPolicy = usePlayerStore((state) => state.playbackPolicy);
  const controlDisabled = !canControlRoom || !hasPlayableTrack || Boolean(pendingCommand);
  const playPauseDisabled =
    !hasPlayableTrack || Boolean(pendingCommand) || (isHost && !canControlRoom);

  useEffect(
    () => () => {
      if (seekTimeoutRef.current !== null) {
        window.clearTimeout(seekTimeoutRef.current);
      }
    },
    [],
  );

  async function runHostCommand(
    command: PlayerCommand,
    action: () => Promise<unknown>,
    onFailure?: () => void,
  ) {
    if (!canControlRoom || pendingCommandRef.current) {
      return;
    }

    if (command !== 'seek' && seekTimeoutRef.current !== null) {
      window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    pendingCommandRef.current = command;
    setPendingCommand(command);
    setCommandError(null);

    try {
      await action();
    } catch (error) {
      onFailure?.();
      setCommandError(
        error instanceof Error && error.message === 'Socket is not connected.'
          ? '서버에 연결하지 못했어요.'
          : getApiErrorMessage(error, { codeOverrides: PLAYER_COMMAND_ERROR_MESSAGE_OVERRIDES }),
      );
    } finally {
      pendingCommandRef.current = null;
      setPendingCommand(null);
    }
  }

  function handlePlayPause() {
    if (!hasPlayableTrack) {
      return;
    }

    if (!isHost) {
      if (isLocalSyncPaused) {
        resumeLocalSync();
        beginPlaybackSync('manual');
        try {
          playbackCommands.requestSync(roomId);
        } catch {
          pauseLocalSync();
          setPlaybackSyncError();
        }
        return;
      }

      pauseLocalSync();
      playerControllerRef?.current?.pause();
      return;
    }

    if (isPlaying) {
      void runHostCommand('pause', () => playbackCommands.pause(roomId, currentTime));
      return;
    }

    void runHostCommand(
      'play',
      () => {
        // 탭 이벤트와 같은 호출 스택에서 재생해 모바일 자동재생 정책을 충족한다.
        playerControllerRef?.current?.play();
        return playbackCommands.play(roomId, currentTime);
      },
      () => playerControllerRef?.current?.pause(),
    );
  }

  function handlePreviousTrack() {
    if (!hasPlayableTrack) {
      return;
    }

    // 탭 이벤트와 같은 호출 스택에서 재생해 모바일 자동재생 정책을 충족한다.
    playerControllerRef?.current?.play();
    void runHostCommand('previous', () => playbackCommands.changeTrack(roomId, 'previous'));
  }

  function handleNextTrack() {
    if (!hasPlayableTrack) {
      return;
    }

    // 탭 이벤트와 같은 호출 스택에서 재생해 모바일 자동재생 정책을 충족한다.
    playerControllerRef?.current?.play();
    void runHostCommand('next', () => playbackCommands.changeTrack(roomId, 'next'));
  }

  function handleSelectTrack(playlistItemId: string) {
    if (!playlistItemId || !canControlRoom || pendingCommandRef.current) {
      return;
    }

    // 탭 이벤트와 같은 호출 스택에서 재생해 모바일 자동재생 정책을 충족한다.
    playerControllerRef?.current?.play();
    void runHostCommand(
      'select',
      () => playbackCommands.changeTrack(roomId, 'select', playlistItemId),
      isPlaying ? undefined : () => playerControllerRef?.current?.pause(),
    );
  }

  function handleRepeatToggle() {
    let nextRepeatMode: 'off' | 'all' | 'one' = 'all';
    if (playbackPolicy?.repeatMode === 'all') {
      nextRepeatMode = 'one';
    } else if (playbackPolicy?.repeatMode === 'one') {
      nextRepeatMode = 'off';
    }
    void runHostCommand('repeat', () =>
      playbackCommands.updateSettings(roomId, { repeatMode: nextRepeatMode }),
    );
  }

  function handleShuffleToggle() {
    void runHostCommand('shuffle', () =>
      playbackCommands.updateSettings(roomId, { shuffleEnabled: !playbackPolicy?.shuffleEnabled }),
    );
  }

  function handlePlaybackStateChange(nextIsPlaying: boolean, nextCurrentTime: number) {
    if (!hasPlayableTrack || !Number.isFinite(nextCurrentTime) || nextCurrentTime < 0) {
      return;
    }

    if (!isHost) {
      if (isLocalSyncPaused) {
        return;
      }

      beginPlaybackSync();
      try {
        playbackCommands.requestSync(roomId);
      } catch {
        clearPlaybackSync();
        // 다음 서버 tick에서 Member의 로컬 재생 상태를 다시 보정한다.
      }
      return;
    }

    if (!canControlRoom) {
      return;
    }

    const command = nextIsPlaying ? 'play' : 'pause';
    const action = nextIsPlaying ? playbackCommands.play : playbackCommands.pause;

    void runHostCommand(command, () => action(roomId, nextCurrentTime));
  }

  function handleSeek(seekTime: number) {
    if (
      !canControlRoom ||
      pendingCommandRef.current ||
      !hasPlayableTrack ||
      !Number.isFinite(seekTime) ||
      seekTime < 0
    ) {
      return;
    }

    if (seekTimeoutRef.current !== null) {
      window.clearTimeout(seekTimeoutRef.current);
    }

    seekTimeoutRef.current = window.setTimeout(() => {
      seekTimeoutRef.current = null;
      void runHostCommand('seek', () => playbackCommands.seek(roomId, seekTime));
    }, SEEK_DEBOUNCE_MS);
  }

  return {
    commandError,
    controlDisabled,
    handleNextTrack,
    handlePlaybackStateChange,
    handlePlayPause,
    handlePreviousTrack,
    handleSelectTrack,
    handleRepeatToggle,
    handleSeek,
    handleShuffleToggle,
    pendingCommand,
    isLocalSyncPaused,
    playPauseDisabled,
  };
}
