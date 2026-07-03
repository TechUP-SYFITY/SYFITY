export type GetChatsResponse = {
  success: true;
  data: {
    chats: Array<{
      id: string;
      userId: string | null;
      nickname: string | null;
      type: 'user' | 'system';
      message: string;
      createdAt: string;
    }>;
    hasMore: boolean;
  };
};
