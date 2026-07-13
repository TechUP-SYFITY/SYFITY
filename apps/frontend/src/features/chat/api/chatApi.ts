import type { GetChatsResponse } from '@syfity/shared';

import { apiClient } from '@/shared/lib/api/apiClient';

export interface ChatHistoryCursor {
  cursorTime: string;
  cursorId: string;
}

export interface GetChatHistoryParams extends ChatHistoryCursor {
  limit?: number;
}

const getChatHistory = (roomId: string, params: GetChatHistoryParams) => {
  const searchParams = new URLSearchParams({
    cursorTime: params.cursorTime,
    cursorId: params.cursorId,
  });

  if (params.limit !== undefined) {
    searchParams.set('limit', params.limit.toString());
  }

  return apiClient.get<GetChatsResponse['data']>(
    `/rooms/${roomId}/chats?${searchParams.toString()}`,
  );
};

export const chatApi = {
  getChatHistory,
};
