import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { ChatController } from './chat.controller';
import type { ChatRecord } from '../types/chat';

const userChat: ChatRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const systemChat: ChatRecord = {
  id: 'message-system',
  userId: null,
  nickname: null,
  profileImage: null,
  type: 'system',
  message: 'Alice joined',
  createdAt: new Date('2026-07-01T12:01:00.000Z'),
};

function makeService(chats: ChatRecord[] = [userChat], hasMore = false) {
  return {
    getChats: vi.fn().mockResolvedValue({ chats, hasMore }),
  };
}

function makeRequest(): ExRequest {
  return {
    user: { id: 'user-1', email: 'alice@example.com' },
  } as ExRequest;
}

describe('ChatController', () => {
  it('GET /rooms/:roomId/chats 응답을 반환한다', async () => {
    const service = makeService([userChat], false);
    const controller = new ChatController(service);

    await expect(
      controller.getChats(
        'room-1',
        makeRequest(),
        '2026-07-01T12:05:00.000Z',
        'message-cursor',
        20,
      ),
    ).resolves.toEqual({
      success: true,
      data: {
        chats: [
          {
            id: 'message-1',
            userId: 'user-1',
            nickname: 'Alice',
            profileImage: 'https://example.com/alice.png',
            type: 'user',
            message: 'hello',
            createdAt: '2026-07-01T12:00:00.000Z',
          },
        ],
        hasMore: false,
      },
    });
    expect(service.getChats).toHaveBeenCalledWith({
      roomId: 'room-1',
      cursorTime: '2026-07-01T12:05:00.000Z',
      cursorId: 'message-cursor',
      limit: 20,
      userId: 'user-1',
    });
  });

  it('hasMore true 응답을 반환한다', async () => {
    const service = makeService([userChat], true);
    const controller = new ChatController(service);

    await expect(
      controller.getChats('room-1', makeRequest(), '2026-07-01T12:05:00.000Z', 'message-cursor'),
    ).resolves.toEqual({
      success: true,
      data: {
        chats: [
          {
            id: 'message-1',
            userId: 'user-1',
            nickname: 'Alice',
            profileImage: 'https://example.com/alice.png',
            type: 'user',
            message: 'hello',
            createdAt: '2026-07-01T12:00:00.000Z',
          },
        ],
        hasMore: true,
      },
    });
  });

  it('createdAt을 ISO 8601 문자열로 직렬화한다', async () => {
    const service = makeService([userChat], false);
    const controller = new ChatController(service);

    const response = await controller.getChats(
      'room-1',
      makeRequest(),
      '2026-07-01T12:05:00.000Z',
      'message-cursor',
    );

    expect(response.data.chats[0]?.createdAt).toBe('2026-07-01T12:00:00.000Z');
  });

  it('시스템 메시지의 userId와 nickname null을 유지한다', async () => {
    const service = makeService([systemChat], false);
    const controller = new ChatController(service);

    await expect(
      controller.getChats('room-1', makeRequest(), '2026-07-01T12:05:00.000Z', 'message-cursor'),
    ).resolves.toEqual({
      success: true,
      data: {
        chats: [
          {
            id: 'message-system',
            userId: null,
            nickname: null,
            profileImage: null,
            type: 'system',
            message: 'Alice joined',
            createdAt: '2026-07-01T12:01:00.000Z',
          },
        ],
        hasMore: false,
      },
    });
  });

  it('service 에러를 그대로 전파한다', async () => {
    const error = new Error('service failed');
    const service = makeService();
    service.getChats.mockRejectedValue(error);
    const controller = new ChatController(service);

    await expect(
      controller.getChats('room-1', makeRequest(), '2026-07-01T12:05:00.000Z', 'message-cursor'),
    ).rejects.toThrow(error);
  });
});
