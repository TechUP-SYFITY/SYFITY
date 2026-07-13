'use client';

// 실시간 채팅 메시지와 전송 오류를 보관한다.
import { create } from 'zustand';

import type { ChatMessage } from '@/shared/types/domain';
import type { ChatSendAckData } from '@/shared/types/socket';

interface ChatStoreState {
  messages: ChatMessage[];
  outgoingScrollRequestId: number;
  sendError: string | null;
  addOptimisticMessage: (message: ChatMessage) => void;
  addReceivedMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  prependMessages: (olderMessages: ChatMessage[]) => void;
  reconcileOptimisticMessage: (tempId: string, data: ChatSendAckData) => void;
  removeMessage: (id: string) => void;
  requestOutgoingScroll: () => void;
  setMessages: (messages: ChatMessage[]) => void;
  setSendError: (message: string | null) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  addOptimisticMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  addReceivedMessage: (message) =>
    set((state) => {
      const existingIndex = state.messages.findIndex((chat) => chat.id === message.id);

      if (existingIndex === -1) {
        return { messages: [...state.messages, message] };
      }

      return {
        messages: state.messages.map((chat, index) => (index === existingIndex ? message : chat)),
      };
    }),
  clearMessages: () => set({ messages: [], outgoingScrollRequestId: 0, sendError: null }),
  messages: [],
  outgoingScrollRequestId: 0,
  prependMessages: (olderMessages) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((message) => message.id));
      const dedupedMessages = olderMessages.filter((message) => !existingIds.has(message.id));

      if (dedupedMessages.length === 0) {
        return state;
      }

      return { messages: [...dedupedMessages, ...state.messages] };
    }),
  reconcileOptimisticMessage: (tempId, data) =>
    set((state) => {
      const hasReceivedMessage = state.messages.some((message) => message.id === data.id);

      if (hasReceivedMessage) {
        return {
          messages: state.messages.filter((message) => message.id !== tempId),
        };
      }

      return {
        messages: state.messages.map((message) =>
          message.id === tempId
            ? {
                ...message,
                createdAt: data.createdAt,
                id: data.id,
              }
            : message,
        ),
      };
    }),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
    })),
  requestOutgoingScroll: () =>
    set((state) => ({
      outgoingScrollRequestId: state.outgoingScrollRequestId + 1,
    })),
  sendError: null,
  setMessages: (messages) => set({ messages }),
  setSendError: (message) => set({ sendError: message }),
}));
