import { describe, expect, it } from 'vitest';

import type { GetChatsResponse } from '@syfity/shared';

import { chatHistoryFixture, roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { ApiResponse } from '@/shared/types/api';

const getChats = async (roomId: string, query: string) => {
  const response = await fetch(`http://localhost:4000/api/v1/rooms/${roomId}/chats?${query}`);
  const data = (await response.json()) as ApiResponse<GetChatsResponse['data']>;

  return { data, status: response.status };
};

describe('chat MSW handlers', () => {
  it('returns a cursor-based first history page', async () => {
    const cursor = roomFixture.chats[0];

    if (!cursor) {
      throw new Error('roomFixture.chats[0] is required.');
    }

    const { data, status } = await getChats(
      roomFixture.room.id,
      new URLSearchParams({
        cursorId: cursor.id,
        cursorTime: cursor.createdAt,
        limit: '50',
      }).toString(),
    );

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: {
        chats: expect.arrayContaining([chatHistoryFixture[59]]),
        hasMore: true,
      },
    });
    expect(data.success && data.data.chats).toHaveLength(50);
  });

  it('returns the remaining history page after the first page cursor', async () => {
    const firstPageCursor = chatHistoryFixture[10];

    if (!firstPageCursor) {
      throw new Error('chatHistoryFixture[10] is required.');
    }

    const { data, status } = await getChats(
      roomFixture.room.id,
      new URLSearchParams({
        cursorId: firstPageCursor.id,
        cursorTime: firstPageCursor.createdAt,
        limit: '50',
      }).toString(),
    );

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: {
        chats: chatHistoryFixture.slice(0, 10).reverse(),
        hasMore: false,
      },
    });
  });

  it('returns VALIDATION_ERROR for an invalid cursorTime', async () => {
    const { data, status } = await getChats(
      roomFixture.room.id,
      'cursorTime=not-a-date&cursorId=chat-1',
    );

    expect(status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid chat history cursor',
      },
    });
  });

  it('returns ROOM_NOT_FOUND for an unknown room', async () => {
    const { data, status } = await getChats(
      'unknown-room',
      'cursorTime=2026-07-01T10%3A12%3A00.000Z&cursorId=chat-1',
    );

    expect(status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      },
    });
  });
});
