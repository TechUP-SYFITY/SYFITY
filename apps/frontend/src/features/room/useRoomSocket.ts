'use client';

// REST 입장 완료 이후 Socket Room 참여와 재연결 복구를 처리한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type {
  RoomClosedPayload,
  RoomHostDisconnectedPayload,
  RoomJoinPayload,
} from '@/shared/types/socket';

import { useRoomStore } from './roomStore';

export const useRoomSocket = (roomId: string, onRoomClosed?: () => void) => {
  const markHostDisconnected = useRoomStore((state) => state.markHostDisconnected);
  const markHostReconnected = useRoomStore((state) => state.markHostReconnected);
  const markRoomClosed = useRoomStore((state) => state.markRoomClosed);
  const setRoomSocketError = useRoomStore((state) => state.setRoomSocketError);
  const updateMember = useRoomStore((state) => state.updateMember);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();
    const handleHostDisconnected = (payload: RoomHostDisconnectedPayload) => {
      if (payload.roomId === roomId) {
        markHostDisconnected(payload.waitUntil);
      }
    };
    const handleHostReconnected = (payload: RoomJoinPayload) => {
      if (payload.roomId === roomId) {
        markHostReconnected();
      }
    };
    const handleRoomClosed = (payload: RoomClosedPayload) => {
      if (payload.roomId !== roomId) {
        return;
      }

      markRoomClosed(payload.reason);
      onRoomClosed?.();
    };
    const joinRoom = () => {
      socket.emit('room:join', { roomId }, (response) => {
        if (response.success) {
          const { hostConnection } = response.data;
          if (hostConnection.status === 'disconnected') {
            markHostDisconnected(hostConnection.waitUntil);
          } else {
            markHostReconnected();
          }
          setRoomSocketError(null);
          return;
        }

        setRoomSocketError(response.error.message);
      });
    };

    socket.on('connect', joinRoom);
    socket.on('room:host-disconnected', handleHostDisconnected);
    socket.on('room:host-reconnected', handleHostReconnected);
    socket.on('room:closed', handleRoomClosed);
    socket.on('presence:update', updateMember);
    joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.off('room:host-disconnected', handleHostDisconnected);
      socket.off('room:host-reconnected', handleHostReconnected);
      socket.off('room:closed', handleRoomClosed);
      socket.off('presence:update', updateMember);
      socket.emit('room:leave', { roomId });
    };
  }, [
    markHostDisconnected,
    markHostReconnected,
    markRoomClosed,
    onRoomClosed,
    roomId,
    setRoomSocketError,
    updateMember,
  ]);
};
