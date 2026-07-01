'use client';

// 서버 playback broadcast를 Player store에 연결한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { usePlayerStore } from './playerStore';

export const usePlaybackSocket = (enabled: boolean) => {
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const socket = socketClient.connect();

    socket.on('playback:play', (payload) => setPlaybackState(payload, 'play'));
    socket.on('playback:pause', (payload) => setPlaybackState(payload, 'pause'));
    socket.on('playback:seek', (payload) => setPlaybackState(payload, 'seek'));
    socket.on('playback:change-track', (payload) => setPlaybackState(payload, 'change-track'));
    socket.on('playback:tick', (payload) => setPlaybackState(payload, 'tick'));
    socket.on('playback:sync-response', (payload) => setPlaybackState(payload, 'sync-response'));
    socket.on('playback:error', (payload) => {
      setPlaybackError(payload.videoId, payload.errorCode);
    });

    return () => {
      socket.off('playback:play');
      socket.off('playback:pause');
      socket.off('playback:seek');
      socket.off('playback:change-track');
      socket.off('playback:tick');
      socket.off('playback:sync-response');
      socket.off('playback:error');
    };
  }, [enabled, setPlaybackError, setPlaybackState]);
};
