import { describe, expect, it } from 'vitest';

import { toChatReceivedPayload, toChatSystemPayload } from './chatPayload';
import type { ChatMessageRecord } from '../types/chat';

const userMessage: ChatMessageRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const systemMessage: ChatMessageRecord = {
  id: 'message-system',
  userId: null,
  nickname: null,
  profileImage: null,
  type: 'system',
  message: 'Alice님이 입장했습니다.',
  createdAt: new Date('2026-07-01T12:01:00.000Z'),
};

describe('chatPayload', () => {
  it('user 메시지를 chat:received payload로 변환한다', () => {
    expect(toChatReceivedPayload(userMessage)).toEqual({
      id: 'message-1',
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: 'https://example.com/alice.png',
      type: 'user',
      message: 'hello',
      createdAt: '2026-07-01T12:00:00.000Z',
    });
  });

  it('nickname이 null이면 빈 문자열로 변환한다', () => {
    expect(toChatReceivedPayload({ ...userMessage, nickname: null })).toMatchObject({
      nickname: '',
    });
  });

  it('system 메시지를 chat:received payload로 변환하려 하면 예외를 던진다', () => {
    expect(() => toChatReceivedPayload(systemMessage)).toThrow(
      'toChatReceivedPayload는 type=user 메시지에만 사용할 수 있습니다.',
    );
  });

  it('system 메시지를 chat:system payload로 변환한다', () => {
    expect(toChatSystemPayload(systemMessage)).toEqual({
      id: 'message-system',
      type: 'system',
      message: 'Alice님이 입장했습니다.',
      createdAt: '2026-07-01T12:01:00.000Z',
    });
  });
});
