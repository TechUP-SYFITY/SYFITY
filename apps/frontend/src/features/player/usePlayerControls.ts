// Player 재생 제어 상태와 Socket 명령 실행을 관리한다.
import { useState } from 'react';

import { playbackCommands } from './playbackCommands';

export type PlayerCommand = 'play' | 'pause' | 'previous' | 'next';

interface UsePlayerControlsParams {
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
  currentTime,
  hasPlayableTrack,
  isPlaying,
  nextItemId,
  previousItemId,
}: UsePlayerControlsParams) {
  const [pendingCommand, setPendingCommand] = useState<PlayerCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const controlDisabled = !isHost || !hasPlayableTrack || Boolean(pendingCommand);
  const syncDisabled = !hasPlayableTrack;

  function handleSyncRequest() {
    if (!hasPlayableTrack) {
      return;
    }

    try {
      playbackCommands.requestSync(roomId);
      setSyncFeedback('동기화 요청을 보냈어요.');
      setCommandError(null);
    } catch (error) {
      setCommandError(getPlayerCommandErrorMessage(error));
    }
  }

  async function runHostCommand(command: PlayerCommand, action: () => Promise<unknown>) {
    if (!isHost || pendingCommand) {
      return;
    }

    setPendingCommand(command);
    setCommandError(null);

    try {
      await action();
    } catch (error) {
      setCommandError(getPlayerCommandErrorMessage(error));
    } finally {
      setPendingCommand(null);
    }
  }

  function handlePlayPause() {
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
    if (!nextItemId) {
      void runHostCommand('next', () => playbackCommands.pause(roomId, 0));
      return;
    }

    void runHostCommand('next', () => playbackCommands.changeTrack(roomId, nextItemId));
  }

  return {
    commandError,
    controlDisabled,
    handleNextTrack,
    handlePlayPause,
    handlePreviousTrack,
    handleSyncRequest,
    pendingCommand,
    syncDisabled,
    syncStatus: syncFeedback,
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
