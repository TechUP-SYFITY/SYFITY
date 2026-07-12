import { beforeEach, describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/shared/types/domain';

import { useChatStore } from './chatStore';

const firstMessage: ChatMessage = {
  createdAt: '2026-07-01T10:12:00.000Z',
  id: 'chat-1',
  message: '안녕하세요.',
  nickname: '민지',
  profileImage: null,
  type: 'user',
  userId: 'user-1',
};

const secondMessage: ChatMessage = {
  createdAt: '2026-07-01T10:13:00.000Z',
  id: 'chat-2',
  message: '반가워요.',
  nickname: '지민',
  profileImage: null,
  type: 'user',
  userId: 'user-2',
};

const optimisticMessage: ChatMessage = {
  createdAt: '2026-07-01T10:14:00.000Z',
  id: 'temp-chat-1',
  message: '낙관적 메시지',
  nickname: '나',
  profileImage: null,
  type: 'user',
  userId: null,
};

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  it('setMessages로 메시지 목록을 교체한다', () => {
    useChatStore.getState().setMessages([firstMessage, secondMessage]);

    expect(useChatStore.getState().messages).toEqual([firstMessage, secondMessage]);
  });

  it('addReceivedMessage는 신규 id 메시지를 배열 끝에 추가한다', () => {
    useChatStore.getState().setMessages([firstMessage]);

    useChatStore.getState().addReceivedMessage(secondMessage);

    expect(useChatStore.getState().messages).toEqual([firstMessage, secondMessage]);
  });

  it('addReceivedMessage는 기존 id 메시지를 새 payload로 교체한다', () => {
    const updatedMessage = {
      ...firstMessage,
      message: '서버에서 정리된 메시지',
    };
    useChatStore.getState().setMessages([firstMessage, secondMessage]);

    useChatStore.getState().addReceivedMessage(updatedMessage);

    expect(useChatStore.getState().messages).toEqual([updatedMessage, secondMessage]);
  });

  it('addOptimisticMessage는 메시지를 배열 끝에 추가한다', () => {
    useChatStore.getState().setMessages([firstMessage]);

    useChatStore.getState().addOptimisticMessage(optimisticMessage);

    expect(useChatStore.getState().messages).toEqual([firstMessage, optimisticMessage]);
  });

  it('prependMessages는 이전 메시지를 배열 앞에 추가한다', () => {
    useChatStore.getState().setMessages([secondMessage]);

    useChatStore.getState().prependMessages([firstMessage]);

    expect(useChatStore.getState().messages).toEqual([firstMessage, secondMessage]);
  });

  it('prependMessages는 이미 있는 id를 중복 삽입하지 않는다', () => {
    const olderMessage: ChatMessage = {
      createdAt: '2026-07-01T10:11:00.000Z',
      id: 'chat-0',
      message: '먼저 온 메시지',
      nickname: '수빈',
      profileImage: null,
      type: 'user',
      userId: 'user-0',
    };
    useChatStore.getState().setMessages([firstMessage, secondMessage]);

    useChatStore.getState().prependMessages([olderMessage, firstMessage]);

    expect(useChatStore.getState().messages).toEqual([olderMessage, firstMessage, secondMessage]);
  });

  it('reconcileOptimisticMessage는 ack가 먼저 온 경우 tempId 메시지의 id와 createdAt을 패치한다', () => {
    useChatStore.getState().setMessages([optimisticMessage]);

    useChatStore.getState().reconcileOptimisticMessage('temp-chat-1', {
      createdAt: '2026-07-01T10:15:00.000Z',
      id: 'chat-3',
    });

    expect(useChatStore.getState().messages).toEqual([
      {
        ...optimisticMessage,
        createdAt: '2026-07-01T10:15:00.000Z',
        id: 'chat-3',
      },
    ]);
  });

  it('reconcileOptimisticMessage는 서버 메시지가 이미 있으면 tempId 메시지만 제거한다', () => {
    const receivedMessage = {
      ...optimisticMessage,
      createdAt: '2026-07-01T10:15:00.000Z',
      id: 'chat-3',
    };
    useChatStore.getState().setMessages([optimisticMessage, receivedMessage]);

    useChatStore.getState().reconcileOptimisticMessage('temp-chat-1', {
      createdAt: receivedMessage.createdAt,
      id: receivedMessage.id,
    });

    expect(useChatStore.getState().messages).toEqual([receivedMessage]);
  });

  it('removeMessage는 지정 id 메시지를 제거한다', () => {
    useChatStore.getState().setMessages([firstMessage, secondMessage]);

    useChatStore.getState().removeMessage(firstMessage.id);

    expect(useChatStore.getState().messages).toEqual([secondMessage]);
  });

  it('setSendError와 clearMessages는 전송 오류 상태를 갱신한다', () => {
    useChatStore.getState().setMessages([firstMessage]);
    useChatStore.getState().setSendError('메시지 전송 실패');

    expect(useChatStore.getState().sendError).toBe('메시지 전송 실패');

    useChatStore.getState().clearMessages();

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().sendError).toBeNull();
  });
});
