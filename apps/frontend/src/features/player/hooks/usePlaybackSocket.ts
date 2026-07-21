'use client';

// 서버 playback broadcast를 Player store에 연결한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { PlaybackState } from '@/shared/types/domain';
import type {
  PlaybackErrorBroadcastPayload,
  PlaybackResetPayload,
  PlaybackSettingsPayload,
} from '@/shared/types/socket';

import { usePlayerStore } from '../store/playerStore';

export const usePlaybackSocket = (enabled: boolean) => {
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const setPlaybackPolicy = usePlayerStore((state) => state.setPlaybackPolicy);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const socket = socketClient.connect();
    const handlePlay = (payload: PlaybackState) => setPlaybackState(payload, 'play');
    const handlePause = (payload: PlaybackState) => setPlaybackState(payload, 'pause');
    const handleSeek = (payload: PlaybackState) => setPlaybackState(payload, 'seek');
    const handleChangeTrack = (payload: PlaybackState) => setPlaybackState(payload, 'change-track');
    const handleTick = (payload: PlaybackState) => setPlaybackState(payload, 'tick');
    const handleSyncResponse = (payload: PlaybackState) =>
      setPlaybackState(payload, 'sync-response');
    const handlePlaybackError = (payload: PlaybackErrorBroadcastPayload) => {
      setPlaybackError(payload.videoId, payload.errorCode);
    };
    const handleSettings = (payload: PlaybackSettingsPayload) => {
      setPlaybackPolicy({ repeatMode: payload.repeatMode, shuffleEnabled: payload.shuffleEnabled });
    };
    const handleReset = (payload: PlaybackResetPayload) => {
      setPlaybackState(payload.playbackState, 'reset');
      setPlaybackPolicy(payload.playbackPolicy);
    };

    socket.on('playback:play', handlePlay);
    socket.on('playback:pause', handlePause);
    socket.on('playback:seek', handleSeek);
    socket.on('playback:change-track', handleChangeTrack);
    socket.on('playback:tick', handleTick);
    socket.on('playback:sync-response', handleSyncResponse);
    socket.on('playback:error', handlePlaybackError);
    socket.on('playback:settings', handleSettings);
    socket.on('playback:reset', handleReset);

    return () => {
      socket.off('playback:play', handlePlay);
      socket.off('playback:pause', handlePause);
      socket.off('playback:seek', handleSeek);
      socket.off('playback:change-track', handleChangeTrack);
      socket.off('playback:tick', handleTick);
      socket.off('playback:sync-response', handleSyncResponse);
      socket.off('playback:error', handlePlaybackError);
      socket.off('playback:settings', handleSettings);
      socket.off('playback:reset', handleReset);
    };
  }, [enabled, setPlaybackError, setPlaybackPolicy, setPlaybackState]);
};
