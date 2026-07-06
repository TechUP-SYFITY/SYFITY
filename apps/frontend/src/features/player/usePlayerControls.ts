// Player 재생 제어 상태와 Socket 명령 실행을 관리한다.
import { useCallback, useMemo, useState } from 'react';

import { playbackCommands } from './playbackCommands';
import { usePlayerStore } from './playerStore';

export type PlayerCommand = 'play' | 'pause' | 'next';

interface UsePlayerControlsParams {
  roomId: string;
  isHost: boolean;
  currentTime: number;
  hasPlayableTrack: boolean;
  isPlaying: boolean;
  nextItemId?: string;
}

export function usePlayerControls({
  roomId,
  isHost,
  currentTime,
  hasPlayableTrack,
  isPlaying,
  nextItemId,
}: UsePlayerControlsParams) {
  const lastEventSource = usePlayerStore((state) => state.lastEventSource);
  const [pendingCommand, setPendingCommand] = useState<PlayerCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const controlDisabled = !isHost || !hasPlayableTrack || Boolean(pendingCommand);
  const syncDisabled = !hasPlayableTrack;
  const syncStatus = useMemo(() => {
    if (lastEventSource === 'sync-response') {
      return '서버 재생 위치와 동기화됐어요.';
    }

    if (lastEventSource === 'tick') {
      return '서버 기준 재생 위치를 확인했어요.';
    }

    return syncFeedback;
  }, [lastEventSource, syncFeedback]);

  const handleSyncRequest = useCallback(() => {
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
  }, [hasPlayableTrack, roomId]);

  const runHostCommand = useCallback(
    async (command: PlayerCommand, action: () => Promise<unknown>) => {
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
    },
    [isHost, pendingCommand],
  );

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      void runHostCommand('pause', () => playbackCommands.pause(roomId, currentTime));
      return;
    }

    void runHostCommand('play', () => playbackCommands.play(roomId, currentTime));
  }, [currentTime, isPlaying, roomId, runHostCommand]);

  const handleNextTrack = useCallback(() => {
    if (!nextItemId) {
      void runHostCommand('next', () => playbackCommands.pause(roomId, 0));
      return;
    }

    void runHostCommand('next', () => playbackCommands.changeTrack(roomId, nextItemId));
  }, [nextItemId, roomId, runHostCommand]);

  return {
    commandError,
    controlDisabled,
    handleNextTrack,
    handlePlayPause,
    handleSyncRequest,
    pendingCommand,
    syncDisabled,
    syncStatus,
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
