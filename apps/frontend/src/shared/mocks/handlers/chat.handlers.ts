import { http, HttpResponse } from 'msw';

import type { GetChatsResponse } from '@syfity/shared';

import type { ApiFailureResponse } from '@/shared/types/api';

import { chatHistoryFixture, roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';
const DEFAULT_LIMIT = 50;

const createErrorResponse = (code: string, message: string, status: number) =>
  HttpResponse.json({ success: false, error: { code, message } } satisfies ApiFailureResponse, {
    status,
  });

const isValidIsoDate = (value: string | null) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const compareByCreatedAtAndIdDesc = (
  a: GetChatsResponse['data']['chats'][number],
  b: GetChatsResponse['data']['chats'][number],
) => {
  if (a.createdAt === b.createdAt) {
    return b.id.localeCompare(a.id);
  }

  return b.createdAt.localeCompare(a.createdAt);
};

const isBeforeCursor = (
  chat: GetChatsResponse['data']['chats'][number],
  cursorTime: string,
  cursorId: string,
) => chat.createdAt < cursorTime || (chat.createdAt === cursorTime && chat.id < cursorId);

export const chatHandlers = [
  http.get(`${API}/rooms/:roomId/chats`, ({ params, request }) => {
    if (params.roomId !== roomFixture.room.id) {
      return createErrorResponse('ROOM_NOT_FOUND', 'Room not found', 404);
    }

    const url = new URL(request.url);
    const cursorTime = url.searchParams.get('cursorTime');
    const cursorId = url.searchParams.get('cursorId');

    if (!isValidIsoDate(cursorTime) || !cursorId) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid chat history cursor', 400);
    }

    const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
    const sortedHistory = [...chatHistoryFixture].sort(compareByCreatedAtAndIdDesc);
    const filteredHistory = sortedHistory.filter((chat) =>
      isBeforeCursor(chat, cursorTime, cursorId),
    );
    const chats = filteredHistory.slice(0, limit);

    return HttpResponse.json({
      success: true,
      data: {
        chats,
        hasMore: filteredHistory.length > limit,
      },
    } satisfies GetChatsResponse);
  }),
];
