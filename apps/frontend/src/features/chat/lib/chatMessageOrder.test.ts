import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/shared/types/domain';

import { sortChatMessagesAscending } from './chatMessageOrder';

const baseMessage = {
  message: '메시지',
  nickname: '민지',
  profileImage: null,
  type: 'user',
  userId: 'user-1',
} satisfies Omit<ChatMessage, 'createdAt' | 'id'>;

describe('sortChatMessagesAscending', () => {
  it('최신순 채팅을 오래된순으로 정렬하고 원본 배열을 바꾸지 않는다', () => {
    const latestFirstMessages: ChatMessage[] = [
      { ...baseMessage, createdAt: '2026-07-01T10:14:00.000Z', id: 'chat-3' },
      { ...baseMessage, createdAt: '2026-07-01T10:12:00.000Z', id: 'chat-1' },
      { ...baseMessage, createdAt: '2026-07-01T10:13:00.000Z', id: 'chat-2' },
    ];

    const sortedMessages = sortChatMessagesAscending(latestFirstMessages);

    expect(sortedMessages.map((message) => message.id)).toEqual(['chat-1', 'chat-2', 'chat-3']);
    expect(latestFirstMessages.map((message) => message.id)).toEqual([
      'chat-3',
      'chat-1',
      'chat-2',
    ]);
  });

  it('createdAt이 같으면 id 오래된순으로 정렬한다', () => {
    const messages: ChatMessage[] = [
      { ...baseMessage, createdAt: '2026-07-01T10:12:00.000Z', id: 'chat-b' },
      { ...baseMessage, createdAt: '2026-07-01T10:12:00.000Z', id: 'chat-a' },
    ];

    expect(sortChatMessagesAscending(messages).map((message) => message.id)).toEqual([
      'chat-a',
      'chat-b',
    ]);
  });
});
