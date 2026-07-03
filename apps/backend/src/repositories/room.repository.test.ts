import { describe, expect, it, vi } from 'vitest';

import {
  RoomRepository,
  type RoomRepositoryPrisma,
  type RoomTransactionPrisma,
} from './room.repository';
import type { RoomDetailRecord, RoomRecord } from '../types/room';

const createdRoom: RoomRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const roomDetail: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  inviteCode: 'ABC123',
  status: 'active',
};

function makeTransactionPrisma(room: RoomRecord = createdRoom): RoomTransactionPrisma {
  return {
    room: {
      create: vi.fn().mockResolvedValue(room),
    },
    roomMember: {
      create: vi.fn().mockResolvedValue({}),
    },
    playbackState: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

function makePrisma(
  overrides: {
    findUniqueResult?: { id: string } | RoomDetailRecord | null;
    tx?: RoomTransactionPrisma;
  } = {},
): { prisma: RoomRepositoryPrisma; tx: RoomTransactionPrisma } {
  const findUniqueResult = 'findUniqueResult' in overrides ? overrides.findUniqueResult : null;
  const tx = overrides.tx ?? makeTransactionPrisma();

  return {
    prisma: {
      room: {
        findUnique: vi.fn().mockResolvedValue(findUniqueResult),
        update: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn((fn: (tx: RoomTransactionPrisma) => Promise<unknown>) =>
        fn(tx),
      ) as unknown as RoomRepositoryPrisma['$transaction'],
    },
    tx,
  };
}

describe('RoomRepository', () => {
  it('초대 코드가 존재하면 true를 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: { id: 'room-1' } });
    const repo = new RoomRepository(prisma);

    await expect(repo.existsInviteCode('ABC123')).resolves.toBe(true);

    expect(prisma.room.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: 'ABC123' },
      select: { id: true },
    });
  });

  it('초대 코드가 없으면 false를 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.existsInviteCode('ABC123')).resolves.toBe(false);
  });

  it('Room이 존재하면 true를 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: { id: 'room-1' } });
    const repo = new RoomRepository(prisma);

    await expect(repo.existsRoom('room-1')).resolves.toBe(true);

    expect(prisma.room.findUnique).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      select: { id: true },
    });
  });

  it('Room이 없으면 false를 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.existsRoom('room-1')).resolves.toBe(false);
  });

  it('Room, Host 멤버, PlaybackState를 트랜잭션으로 생성한다', async () => {
    const { prisma, tx } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(
      repo.createRoom({
        name: 'Morning Jazz',
        hostId: 'user-1',
        inviteCode: 'ABC123',
      }),
    ).resolves.toEqual(createdRoom);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.room.create).toHaveBeenCalledWith({
      data: {
        name: 'Morning Jazz',
        hostId: 'user-1',
        visibility: 'private',
        inviteCode: 'ABC123',
        status: 'active',
        lastActivityAt: expect.any(Date),
      },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        status: true,
        createdAt: true,
      },
    });
    expect(tx.roomMember.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        userId: 'user-1',
        role: 'host',
        status: 'offline',
        joinedAt: expect.any(Date),
      },
    });
    expect(tx.playbackState.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        videoId: null,
        playlistItemId: null,
        baseCurrentTime: 0,
        isPlaying: false,
        serverStartedAt: null,
        serverPausedAt: null,
      },
    });
  });

  it('트랜잭션 오류를 그대로 전파한다', async () => {
    const error = new Error('db failed');
    const { prisma } = makePrisma();
    prisma.$transaction = vi
      .fn()
      .mockRejectedValue(error) as unknown as RoomRepositoryPrisma['$transaction'];
    const repo = new RoomRepository(prisma);

    await expect(
      repo.createRoom({
        name: 'Morning Jazz',
        hostId: 'user-1',
        inviteCode: 'ABC123',
      }),
    ).rejects.toThrow(error);
  });

  it('ID로 Room 상세를 조회한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: roomDetail });
    const repo = new RoomRepository(prisma);

    await expect(repo.findRoomById('room-1')).resolves.toEqual(roomDetail);

    expect(prisma.room.findUnique).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      select: {
        id: true,
        name: true,
        hostId: true,
        status: true,
        inviteCode: true,
      },
    });
  });

  it('Room이 없으면 null을 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.findRoomById('room-1')).resolves.toBeNull();
  });

  it('lastActivityAt을 현재 시각으로 갱신한다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.touchLastActivity('room-1')).resolves.toBeUndefined();

    expect(prisma.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { lastActivityAt: expect.any(Date) },
    });
  });
});
