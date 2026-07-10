'use client';

// 채팅 Socket 이벤트와 optimistic 전송 흐름을 store에 연결한다.
import { useCallback, useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { ChatMessage } from '@/shared/types/domain';

import { CHAT_MAX_MESSAGE_LENGTH } from './chatConstants';
import { useChatStore } from './chatStore';

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

export const useSendChatMessage = (
  roomId: string,
  currentUserName?: string,
  currentUserProfileImage?: string | null,
) => {
  const addOptimisticMessage = useChatStore((state) => state.addOptimisticMessage);
  const reconcileOptimisticMessage = useChatStore((state) => state.reconcileOptimisticMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const setSendError = useChatStore((state) => state.setSendError);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();

      if (!roomId || !trimmed || trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
        return;
      }

      const tempId = `temp-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
      const optimisticMessage: ChatMessage = {
        createdAt: new Date().toISOString(),
        id: tempId,
        message: trimmed,
        nickname: currentUserName ?? null,
        profileImage: currentUserProfileImage ?? null,
        type: 'user',
        userId: null,
      };

      addOptimisticMessage(optimisticMessage);
      setSendError(null);

      socketClient.connect().emit('chat:send', { message: trimmed, roomId }, (ack) => {
        if (ack.success && ack.data) {
          reconcileOptimisticMessage(tempId, ack.data);
          return;
        }

        removeMessage(tempId);
        setSendError(ack.success ? '메시지 전송에 실패했어요.' : ack.error.message);
      });
    },
    [
      addOptimisticMessage,
      currentUserName,
      currentUserProfileImage,
      reconcileOptimisticMessage,
      removeMessage,
      roomId,
      setSendError,
    ],
  );

  return { sendMessage };
};
