'use client';

// presence:update Socket 이벤트를 store에 연결한다.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { roomMemberQueryKeys } from './roomMemberHooks';
import { usePresenceStore } from '../store/presenceStore';
import type { PresenceMember } from '../types/presence';

const ACTIVE_MEMBERS_INVALIDATION_DELAY_MS = 250;

export const usePresenceSocket = (roomId: string) => {
  const queryClient = useQueryClient();
  const applyPresenceUpdate = usePresenceStore((state) => state.applyPresenceUpdate);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();
    let invalidateTimer: ReturnType<typeof setTimeout> | undefined;
    const handlePresenceUpdate = (payload: PresenceMember) => {
      applyPresenceUpdate(payload);
      clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: roomMemberQueryKeys.active(roomId),
        });
      }, ACTIVE_MEMBERS_INVALIDATION_DELAY_MS);
    };

    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      clearTimeout(invalidateTimer);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [applyPresenceUpdate, queryClient, roomId]);
};
