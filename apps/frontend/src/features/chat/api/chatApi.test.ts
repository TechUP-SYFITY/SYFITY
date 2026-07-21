import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/lib/api/apiClient';

import { chatApi } from './chatApi';

vi.mock('@/shared/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);

describe('chatApi.getChatHistory', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('calls the chat history endpoint with cursor and limit query params', async () => {
    getMock.mockResolvedValue({ chats: [], hasMore: false });

    await chatApi.getChatHistory('room-1', {
      cursorId: 'chat-1',
      cursorTime: '2026-07-01T10:12:00.000Z',
      limit: 50,
    });

    expect(getMock).toHaveBeenCalledWith(
      '/rooms/room-1/chats?cursorTime=2026-07-01T10%3A12%3A00.000Z&cursorId=chat-1&limit=50',
    );
  });

  it('omits limit when it is not provided', async () => {
    getMock.mockResolvedValue({ chats: [], hasMore: false });

    await chatApi.getChatHistory('room-1', {
      cursorId: 'chat-1',
      cursorTime: '2026-07-01T10:12:00.000Z',
    });

    expect(getMock).toHaveBeenCalledWith(
      '/rooms/room-1/chats?cursorTime=2026-07-01T10%3A12%3A00.000Z&cursorId=chat-1',
    );
  });
});
