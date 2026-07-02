import type { PrismaClient } from '../generated/prisma/client';
import type { ChatCursor, ChatRecord, IChatRepository } from '../types/chat';

export type ChatRepositoryPrisma = {
  chatMessage: Pick<PrismaClient['chatMessage'], 'findMany'>;
};

export class ChatRepository implements IChatRepository {
  constructor(private readonly prisma: ChatRepositoryPrisma) {}

  async findChatsByCursor(cursor: ChatCursor): Promise<ChatRecord[]> {
    const { roomId, cursorTime, cursorId, limit } = cursor;
    const cursorDate = new Date(cursorTime);

    const rows = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursorId } }],
      },
      select: {
        id: true,
        userId: true,
        type: true,
        message: true,
        createdAt: true,
        user: {
          select: { nickname: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      nickname: row.user?.nickname ?? null,
      type: row.type,
      message: row.message,
      createdAt: row.createdAt,
    }));
  }
}
