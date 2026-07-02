export type ChatRecord = {
  id: string;
  userId: string | null;
  nickname: string | null;
  type: 'user' | 'system';
  message: string;
  createdAt: Date;
};

export type ChatCursor = {
  roomId: string;
  cursorTime: string;
  cursorId: string;
  limit: number;
};

export interface IChatRepository {
  findChatsByCursor(cursor: ChatCursor): Promise<ChatRecord[]>;
}
