export type ChatRecord = {
  id: string;
  userId: string | null;
  nickname: string | null;
  profileImage: string | null;
  type: 'user' | 'system';
  message: string;
  createdAt: Date;
};

export type ChatMessageRecord = ChatRecord;

export type CreateChatMessageInput = {
  roomId: string;
  userId: string | null;
  type: 'user' | 'system';
  message: string;
};

export type ChatCursor = {
  roomId: string;
  cursorTime: Date;
  cursorId: string;
  limit: number;
};

export interface IChatRepository {
  findChatsByCursor(cursor: ChatCursor): Promise<ChatRecord[]>;
  findLatestChats(roomId: string, limit: number): Promise<ChatRecord[]>;
  createMessage(data: CreateChatMessageInput): Promise<ChatMessageRecord>;
}
