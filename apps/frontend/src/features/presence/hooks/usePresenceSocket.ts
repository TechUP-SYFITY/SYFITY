'use client';

// presence:update Socket 이벤트를 store에 연결한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { usePresenceStore } from '../store/presenceStore';

export const usePresenceSocket = (roomId: string) => {
  const applyPresenceUpdate = usePresenceStore((state) => state.applyPresenceUpdate);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();

    socket.on('presence:update', applyPresenceUpdate);

    return () => {
      socket.off('presence:update', applyPresenceUpdate);
    };
  }, [applyPresenceUpdate, roomId]);
};
