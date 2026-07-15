'use client';

// REST 입장 완료 이후 Socket Room 참여와 재연결 복구를 처리한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { RoomMember } from '@/shared/types/domain';
import type {
  RoomClosedPayload,
  RoomHostDisconnectedPayload,
  RoomJoinPayload,
} from '@/shared/types/socket';

import { useRoomStore } from '../store/roomStore';

export const useRoomSocket = (
  roomId: string,
  onRejoined?: (members: RoomMember[]) => void,
  onRoomClosed?: () => void,
) => {
  const markHostDisconnected = useRoomStore((state) => state.markHostDisconnected);
  const markHostReconnected = useRoomStore((state) => state.markHostReconnected);
  const markRoomClosed = useRoomStore((state) => state.markRoomClosed);
  const setRoomSocketError = useRoomStore((state) => state.setRoomSocketError);

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
          const members = response.data?.members;

          if (Array.isArray(members) && members.length > 0) {
            onRejoined?.(members);
          }

          return;
        }

        setRoomSocketError(response.error.message);
      });
    };

    // 브라우저가 백그라운드 탭의 타이머/소켓을 강하게 스로틀링하면, 소켓이
    // 끊긴 채로 소켓.io 자체 재연결 backoff를 한참 기다려야 할 수 있다.
    // 탭이 다시 보이는 시점에 바로 재연결을 시도해 복귀 체감 지연을 줄인다.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !socket.connected) {
        socket.connect();
      }
    };

    socket.on('connect', joinRoom);
    socket.on('room:host-disconnected', handleHostDisconnected);
    socket.on('room:host-reconnected', handleHostReconnected);
    socket.on('room:closed', handleRoomClosed);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    joinRoom();

    return () => {
      socket.off('connect', joinRoom);
      socket.off('room:host-disconnected', handleHostDisconnected);
      socket.off('room:host-reconnected', handleHostReconnected);
      socket.off('room:closed', handleRoomClosed);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.emit('room:leave', { roomId });
    };
  }, [
    markHostDisconnected,
    markHostReconnected,
    markRoomClosed,
    onRejoined,
    onRoomClosed,
    roomId,
    setRoomSocketError,
  ]);
};
