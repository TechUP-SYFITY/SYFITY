'use client';

// REST 입장 완료 이후 Socket Room 참여와 재연결 복구를 처리한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { useRoomStore } from './roomStore';

export const useRoomSocket = (roomId: string) => {
  const setRoomSocketError = useRoomStore((state) => state.setRoomSocketError);
  const updateMember = useRoomStore((state) => state.updateMember);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();
    const joinRoom = () => {
      socket.emit('room:join', { roomId }, (response) => {
        if (response.success) {
          setRoomSocketError(null);
          return;
        }

        setRoomSocketError(response.error.message);
      });
    };

    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('presence:update', updateMember);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('presence:update', updateMember);
      socket.emit('room:leave', { roomId });
    };
  }, [roomId, setRoomSocketError, updateMember]);
};
