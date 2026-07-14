// Player 재생 제어 상태와 Socket 명령 실행을 관리한다.
import { useEffect, useRef, useState } from 'react';

import { playbackCommands } from './playbackCommands';
import { usePlayerStore } from './playerStore';

export type PlayerCommand = 'play' | 'pause' | 'previous' | 'next' | 'seek';

const SEEK_DEBOUNCE_MS = 200;

interface UsePlayerControlsParams {
  canControlRoom?: boolean;
  roomId: string;
  isHost: boolean;
  currentTime: number;
  hasPlayableTrack: boolean;
  isPlaying: boolean;
  nextItemId?: string;
  previousItemId?: string;
}

export function usePlayerControls({
  roomId,
  isHost,
  canControlRoom = isHost,
  currentTime,
  hasPlayableTrack,
  isPlaying,
  nextItemId,
  previousItemId,
}: UsePlayerControlsParams) {
  const seekTimeoutRef = useRef<number | null>(null);
  const pendingCommandRef = useRef<PlayerCommand | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PlayerCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const beginPlaybackSync = usePlayerStore((state) => state.beginPlaybackSync);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const controlDisabled = !canControlRoom || !hasPlayableTrack || Boolean(pendingCommand);

  useEffect(
    () => () => {
      if (seekTimeoutRef.current !== null) {
        window.clearTimeout(seekTimeoutRef.current);
      }
    },
    [],
  );

  async function runHostCommand(command: PlayerCommand, action: () => Promise<unknown>) {
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
      setCommandError(getPlayerCommandErrorMessage(error));
    } finally {
      pendingCommandRef.current = null;
      setPendingCommand(null);
    }
  }

  function handlePlayPause() {
    if (!hasPlayableTrack) {
      return;
    }

    if (isPlaying) {
      void runHostCommand('pause', () => playbackCommands.pause(roomId, currentTime));
      return;
    }

    void runHostCommand('play', () => playbackCommands.play(roomId, currentTime));
  }

  function handlePreviousTrack() {
    if (!hasPlayableTrack || !previousItemId) {
      return;
    }

    void runHostCommand('previous', () => playbackCommands.changeTrack(roomId, previousItemId));
  }

  function handleNextTrack() {
    if (!hasPlayableTrack) {
      return;
    }

    if (!nextItemId) {
      void runHostCommand('next', () => playbackCommands.pause(roomId, 0));
      return;
    }

    void runHostCommand('next', () => playbackCommands.changeTrack(roomId, nextItemId));
  }

  function handlePlaybackStateChange(nextIsPlaying: boolean, nextCurrentTime: number) {
    if (!hasPlayableTrack || !Number.isFinite(nextCurrentTime) || nextCurrentTime < 0) {
      return;
    }

    if (!isHost) {
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
    handleSeek,
    pendingCommand,
  };
}

function getPlayerCommandErrorMessage(error: unknown) {
  const fallbackMessage = '재생 제어 요청에 실패했어요.';

  if (error instanceof Error) {
    if (error.message === 'Socket is not connected.') {
      return '서버에 연결하지 못했어요.';
    }

    if (error.message.includes('AUTH_FORBIDDEN')) {
      return 'Host만 재생을 제어할 수 있어요.';
    }

    if (error.message.includes('PLAYLIST_ITEM_NOT_FOUND')) {
      return '재생할 곡을 찾을 수 없어요.';
    }
  }

  return fallbackMessage;
}
