'use client';

// 채팅 메시지를 optimistic 상태로 전송하고 Socket ack로 확정하거나 되돌린다.
import { useCallback } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { ChatMessage } from '@/shared/types/domain';

import { CHAT_MAX_MESSAGE_LENGTH } from '../constants/chatConstants';
import { useChatStore } from '../store/chatStore';

export const useSendChatMessage = (
  roomId: string,
  currentUserName?: string,
  currentUserProfileImage?: string | null,
) => {
  const addOptimisticMessage = useChatStore((state) => state.addOptimisticMessage);
  const reconcileOptimisticMessage = useChatStore((state) => state.reconcileOptimisticMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const requestOutgoingScroll = useChatStore((state) => state.requestOutgoingScroll);
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
      requestOutgoingScroll();
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
      requestOutgoingScroll,
      roomId,
      setSendError,
    ],
  );

  return { sendMessage };
};
