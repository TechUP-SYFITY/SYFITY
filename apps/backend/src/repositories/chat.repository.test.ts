import { describe, expect, it, vi } from 'vitest';

import { ChatRepository, type ChatRepositoryPrisma } from './chat.repository';

const cursorTime = new Date('2026-07-01T12:00:00.000Z');

type ChatMessageRow = {
  id: string;
  userId: string | null;
  type: 'user' | 'system';
  message: string;
  createdAt: Date;
  user: { nickname: string; profileImage: string | null } | null;
};

function makeRow(overrides: Partial<ChatMessageRow> = {}): ChatMessageRow {
  return {
    id: 'message-1',
    userId: 'user-1',
    type: 'user',
    message: 'hello',
    createdAt: new Date('2026-07-01T11:59:00.000Z'),
    user: { nickname: 'Alice', profileImage: 'https://example.com/alice.png' },
    ...overrides,
  };
}

function makePrisma(rows: ChatMessageRow[] = []): ChatRepositoryPrisma {
  return {
    chatMessage: {
      findMany: vi.fn().mockResolvedValue(rows),
      create: vi.fn().mockResolvedValue(makeRow()),
    },
  };
}

describe('ChatRepository', () => {
  it('커서 이전 메시지를 최신순으로 조회한다', async () => {
    const rows = [makeRow()];
    const prisma = makePrisma(rows);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.findChatsByCursor({
        roomId: 'room-1',
        cursorTime,
        cursorId: 'message-cursor',
        limit: 3,
      }),
    ).resolves.toEqual([
      {
        id: 'message-1',
        userId: 'user-1',
        nickname: 'Alice',
        profileImage: 'https://example.com/alice.png',
        type: 'user',
        message: 'hello',
        createdAt: new Date('2026-07-01T11:59:00.000Z'),
      },
    ]);

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
      where: {
        roomId: 'room-1',
        OR: [
          { createdAt: { lt: cursorTime } },
          { createdAt: cursorTime, id: { lt: 'message-cursor' } },
        ],
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
      take: 3,
    });
  });

  it('메시지가 없으면 빈 배열을 반환한다', async () => {
    const prisma = makePrisma([]);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.findChatsByCursor({
        roomId: 'room-1',
        cursorTime,
        cursorId: 'message-cursor',
        limit: 3,
      }),
    ).resolves.toEqual([]);
  });

  it('시스템 메시지는 nickname을 null로 반환한다', async () => {
    const prisma = makePrisma([
      makeRow({
        id: 'message-system',
        userId: null,
        type: 'system',
        message: 'Alice joined',
        user: null,
      }),
    ]);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.findChatsByCursor({
        roomId: 'room-1',
        cursorTime,
        cursorId: 'message-cursor',
        limit: 3,
      }),
    ).resolves.toEqual([
      {
        id: 'message-system',
        userId: null,
        nickname: null,
        profileImage: null,
        type: 'system',
        message: 'Alice joined',
        createdAt: new Date('2026-07-01T11:59:00.000Z'),
      },
    ]);
  });

  it('전달된 limit을 Prisma take 값으로 사용한다', async () => {
    const prisma = makePrisma([]);
    const repo = new ChatRepository(prisma);

    await repo.findChatsByCursor({
      roomId: 'room-1',
      cursorTime,
      cursorId: 'message-cursor',
      limit: 51,
    });

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 51 }));
  });

  it('Prisma 에러를 그대로 전파한다', async () => {
    const error = new Error('db failed');
    const prisma = makePrisma([]);
    prisma.chatMessage.findMany = vi.fn().mockRejectedValue(error);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.findChatsByCursor({
        roomId: 'room-1',
        cursorTime,
        cursorId: 'message-cursor',
        limit: 3,
      }),
    ).rejects.toThrow(error);
  });

  it('최신 메시지를 최신순으로 조회한다', async () => {
    const rows = [makeRow()];
    const prisma = makePrisma(rows);
    const repo = new ChatRepository(prisma);

    await expect(repo.findLatestChats('room-1', 50)).resolves.toEqual([
      {
        id: 'message-1',
        userId: 'user-1',
        nickname: 'Alice',
        profileImage: 'https://example.com/alice.png',
        type: 'user',
        message: 'hello',
        createdAt: new Date('2026-07-01T11:59:00.000Z'),
      },
    ]);

    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
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
      take: 50,
    });
  });

  it('최신 메시지가 없으면 빈 배열을 반환한다', async () => {
    const prisma = makePrisma([]);
    const repo = new ChatRepository(prisma);

    await expect(repo.findLatestChats('room-1', 50)).resolves.toEqual([]);
  });

  it('최신 시스템 메시지는 nickname을 null로 반환한다', async () => {
    const prisma = makePrisma([
      makeRow({
        id: 'message-system',
        userId: null,
        type: 'system',
        message: 'Alice joined',
        user: null,
      }),
    ]);
    const repo = new ChatRepository(prisma);

    await expect(repo.findLatestChats('room-1', 50)).resolves.toEqual([
      {
        id: 'message-system',
        userId: null,
        nickname: null,
        profileImage: null,
        type: 'system',
        message: 'Alice joined',
        createdAt: new Date('2026-07-01T11:59:00.000Z'),
      },
    ]);
  });

  it('user 메시지를 저장하고 작성자 정보를 포함해 반환한다', async () => {
    const prisma = makePrisma([]);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.createMessage({
        roomId: 'room-1',
        userId: 'user-1',
        type: 'user',
        message: 'hello',
      }),
    ).resolves.toEqual({
      id: 'message-1',
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: 'https://example.com/alice.png',
      type: 'user',
      message: 'hello',
      createdAt: new Date('2026-07-01T11:59:00.000Z'),
    });

    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        userId: 'user-1',
        type: 'user',
        message: 'hello',
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
  });

  it('system 메시지를 저장하고 작성자 정보를 null로 반환한다', async () => {
    const prisma = makePrisma([]);
    prisma.chatMessage.create = vi.fn().mockResolvedValue(
      makeRow({
        id: 'message-system',
        userId: null,
        type: 'system',
        message: 'Alice joined',
        user: null,
      }),
    );
    const repo = new ChatRepository(prisma);

    await expect(
      repo.createMessage({
        roomId: 'room-1',
        userId: null,
        type: 'system',
        message: 'Alice joined',
      }),
    ).resolves.toEqual({
      id: 'message-system',
      userId: null,
      nickname: null,
      profileImage: null,
      type: 'system',
      message: 'Alice joined',
      createdAt: new Date('2026-07-01T11:59:00.000Z'),
    });
  });

  it('메시지 저장 중 Prisma 에러를 그대로 전파한다', async () => {
    const error = new Error('db failed');
    const prisma = makePrisma([]);
    prisma.chatMessage.create = vi.fn().mockRejectedValue(error);
    const repo = new ChatRepository(prisma);

    await expect(
      repo.createMessage({
        roomId: 'room-1',
        userId: 'user-1',
        type: 'user',
        message: 'hello',
      }),
    ).rejects.toThrow(error);
  });
});
