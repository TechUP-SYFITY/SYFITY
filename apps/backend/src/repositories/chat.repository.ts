import type { PrismaClient } from '../generated/prisma/client';
import type {
  ChatCursor,
  ChatMessageRecord,
  ChatRecord,
  CreateChatMessageInput,
  IChatRepository,
} from '../types/chat';

export type ChatRepositoryPrisma = {
  chatMessage: Pick<PrismaClient['chatMessage'], 'findMany' | 'create'>;
};

export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: ChatRepositoryPrisma) {}

  async findChatsByCursor(cursor: ChatCursor): Promise<ChatRecord[]> {
    const { roomId, cursorTime, cursorId, limit } = cursor;

    const rows = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        OR: [{ createdAt: { lt: cursorTime } }, { createdAt: cursorTime, id: { lt: cursorId } }],
      },
      select: {
        id: true,
        userId: true,
        type: true,
        message: true,
        createdAt: true,
        user: {
          select: { nickname: true, profileImage: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      nickname: row.user?.nickname ?? null,
      profileImage: row.user?.profileImage ?? null,
      type: row.type,
      message: row.message,
      createdAt: row.createdAt,
    }));
  }

  async findLatestChats(roomId: string, limit: number): Promise<ChatRecord[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { roomId },
      select: {
        id: true,
        userId: true,
        type: true,
        message: true,
        createdAt: true,
        user: {
          select: { nickname: true, profileImage: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      nickname: row.user?.nickname ?? null,
      profileImage: row.user?.profileImage ?? null,
      type: row.type,
      message: row.message,
      createdAt: row.createdAt,
    }));
  }

  async createMessage(data: CreateChatMessageInput): Promise<ChatMessageRecord> {
    const row = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        type: data.type,
        message: data.message,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        message: true,
        createdAt: true,
        user: {
          select: { nickname: true, profileImage: true },
        },
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      nickname: row.user?.nickname ?? null,
      profileImage: row.user?.profileImage ?? null,
      type: row.type,
      message: row.message,
      createdAt: row.createdAt,
    };
  }
}
