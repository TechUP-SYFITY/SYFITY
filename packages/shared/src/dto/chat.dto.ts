export type ChatMessage = {
  id: string;
  userId: string | null;
  nickname: string | null;
  profileImage: string | null;
  type: 'user' | 'system';
  message: string;
  createdAt: string;
};

export type GetChatsResponse = {
  success: true;
  data: {
    chats: ChatMessage[];
    hasMore: boolean;
  };
};
