'use client';

// Room 채팅 Socket 이벤트를 chat store에 연결한다.
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { useChatStore } from '../store/chatStore';

export const useChatSocket = (roomId: string) => {
  const addReceivedMessage = useChatStore((state) => state.addReceivedMessage);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();

    socket.on('chat:received', addReceivedMessage);
    socket.on('chat:system', addReceivedMessage);

    return () => {
      socket.off('chat:received', addReceivedMessage);
      socket.off('chat:system', addReceivedMessage);
    };
  }, [addReceivedMessage, roomId]);
};
