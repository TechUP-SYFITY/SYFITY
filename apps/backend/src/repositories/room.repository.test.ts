import { describe, expect, it, vi } from 'vitest';

import {
  RoomRepository,
  type RoomRepositoryPrisma,
  type RoomTransactionPrisma,
} from './room.repository';
import { Prisma } from '../generated/prisma/client';
import type { RoomDetailRecord, RoomRecord, RoomUpdateRecord } from '../types/room';

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
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const updatedRoom: RoomUpdateRecord = {
  id: 'room-1',
  name: 'Evening Jazz',
  status: 'active',
  closedAt: null,
  updatedAt: new Date('2026-07-01T12:30:00.000Z'),
};

const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
  'Unique constraint failed on the fields: (`room_id`,`user_id`)',
  { code: 'P2002', clientVersion: 'test' },
);

type RoomMembershipResult = {
  role: 'host' | 'member' | 'guest';
  status: 'online' | 'offline' | 'left';
};

type RoomMemberRow = {
  id: string;
  userId: string;
  role: 'host' | 'member' | 'guest';
  status: 'online' | 'offline' | 'left';
  user: { nickname: string; profileImage: string | null };
};

function makeTransactionPrisma(room: RoomRecord = createdRoom): RoomTransactionPrisma {
  return {
    room: {
      create: vi.fn().mockResolvedValue(room),
      update: vi.fn().mockResolvedValue({ ...updatedRoom, status: 'closed', closedAt: new Date() }),
    },
    roomMember: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    playbackState: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

function makePrisma(
  overrides: {
    findUniqueResult?: { id: string } | RoomDetailRecord | null;
    membershipResult?: RoomMembershipResult | null;
    memberInfoResult?: RoomMemberRow | null;
    membersResult?: RoomMemberRow[];
    roomUpdateResult?: RoomUpdateRecord;
    roomUpdateError?: Error;
    membershipCreateError?: Error;
    tx?: RoomTransactionPrisma;
  } = {},
): { prisma: RoomRepositoryPrisma; tx: RoomTransactionPrisma } {
  const findUniqueResult = 'findUniqueResult' in overrides ? overrides.findUniqueResult : null;
  const tx = overrides.tx ?? makeTransactionPrisma();
  const roomUpdate = vi.fn();
  if (overrides.roomUpdateError) {
    roomUpdate.mockRejectedValue(overrides.roomUpdateError);
  } else {
    roomUpdate.mockResolvedValue(overrides.roomUpdateResult ?? {});
  }

  return {
    prisma: {
      room: {
        findUnique: vi.fn().mockResolvedValue(findUniqueResult),
        update: roomUpdate,
      },
      roomMember: {
        create: overrides.membershipCreateError
          ? vi.fn().mockRejectedValue(overrides.membershipCreateError)
          : vi.fn().mockResolvedValue({}),
        findUnique: vi
          .fn()
          .mockResolvedValue(
            'memberInfoResult' in overrides
              ? overrides.memberInfoResult
              : (overrides.membershipResult ?? null),
          ),
        findMany: vi.fn().mockResolvedValue(overrides.membersResult ?? []),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      recentRoom: {
        upsert: vi.fn().mockResolvedValue({}),
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
        createdAt: true,
      },
    });
  });

  it('Room이 없으면 null을 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.findRoomById('room-1')).resolves.toBeNull();
  });

  it('초대 코드로 Room 상세를 조회한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: roomDetail });
    const repo = new RoomRepository(prisma);

    await expect(repo.findRoomByInviteCode('ABC123')).resolves.toEqual(roomDetail);

    expect(prisma.room.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: 'ABC123' },
      select: {
        id: true,
        name: true,
        hostId: true,
        status: true,
        inviteCode: true,
        createdAt: true,
      },
    });
  });

  it('초대 코드에 해당하는 Room이 없으면 null을 반환한다', async () => {
    const { prisma } = makePrisma({ findUniqueResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.findRoomByInviteCode('ABC123')).resolves.toBeNull();
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

  it('Room 이름을 수정하고 갱신된 정보를 반환한다', async () => {
    const { prisma } = makePrisma({ roomUpdateResult: updatedRoom });
    const repo = new RoomRepository(prisma);

    await expect(repo.updateRoomName('room-1', 'Evening Jazz')).resolves.toEqual(updatedRoom);

    expect(prisma.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { name: 'Evening Jazz' },
      select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
    });
  });

  it('Room 이름 수정 중 Prisma 오류를 그대로 전파한다', async () => {
    const error = new Error('update failed');
    const { prisma } = makePrisma({ roomUpdateError: error });
    const repo = new RoomRepository(prisma);

    await expect(repo.updateRoomName('room-1', 'Evening Jazz')).rejects.toThrow(error);
  });

  it('Room 멤버십을 조회한다', async () => {
    const membership = { role: 'member' as const, status: 'offline' as const };
    const { prisma } = makePrisma({ membershipResult: membership });
    const repo = new RoomRepository(prisma);

    await expect(repo.findMembership('room-1', 'user-1')).resolves.toEqual(membership);

    expect(prisma.roomMember.findUnique).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      select: { role: true, status: true },
    });
  });

  it('Room 멤버십이 없으면 null을 반환한다', async () => {
    const { prisma } = makePrisma({ membershipResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.findMembership('room-1', 'user-1')).resolves.toBeNull();
  });

  it('신규 멤버십을 생성하고 true를 반환한다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.upsertMembership('room-1', 'user-1')).resolves.toBe(true);

    expect(prisma.roomMember.create).toHaveBeenCalledWith({
      data: {
        roomId: 'room-1',
        userId: 'user-1',
        role: 'member',
        status: 'offline',
        joinedAt: expect.any(Date),
        lastSeenAt: expect.any(Date),
      },
    });
    expect(prisma.roomMember.update).not.toHaveBeenCalled();
  });

  it('기존 멤버십이면 unique 충돌 후 복원하고 false를 반환한다', async () => {
    const { prisma } = makePrisma({ membershipCreateError: uniqueConstraintError });
    const repo = new RoomRepository(prisma);

    await expect(repo.upsertMembership('room-1', 'user-1')).resolves.toBe(false);

    expect(prisma.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      data: {
        status: 'offline',
        lastSeenAt: expect.any(Date),
        leftAt: null,
      },
    });
  });

  it('left 상태를 제외하고 멤버 목록을 조회한다', async () => {
    const { prisma } = makePrisma({
      membersResult: [
        {
          id: 'member-1',
          userId: 'user-1',
          role: 'host',
          status: 'online',
          user: { nickname: 'Alice', profileImage: null },
        },
      ],
    });
    const repo = new RoomRepository(prisma);

    await expect(repo.findMembers('room-1')).resolves.toEqual([
      {
        id: 'member-1',
        userId: 'user-1',
        nickname: 'Alice',
        profileImage: null,
        role: 'host',
        status: 'online',
      },
    ]);

    expect(prisma.roomMember.findMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', status: { not: 'left' } },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        user: { select: { nickname: true, profileImage: true } },
      },
    });
  });

  it('최근 Room을 upsert한다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.upsertRecentRoom('user-1', 'room-1')).resolves.toBeUndefined();

    expect(prisma.recentRoom.upsert).toHaveBeenCalledWith({
      where: { userId_roomId: { userId: 'user-1', roomId: 'room-1' } },
      create: { userId: 'user-1', roomId: 'room-1', lastJoinedAt: expect.any(Date) },
      update: { lastJoinedAt: expect.any(Date) },
    });
  });

  it('멤버 상태를 online으로 갱신할 때 leftAt은 변경하지 않는다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.updateMemberStatus('room-1', 'user-1', 'online', ['offline'])).resolves.toBe(
      true,
    );

    expect(prisma.roomMember.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', userId: 'user-1', status: { in: ['offline'] } },
      data: {
        status: 'online',
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it('멤버 상태를 offline으로 갱신할 때 leftAt은 변경하지 않는다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.updateMemberStatus('room-1', 'user-1', 'offline', ['online'])).resolves.toBe(
      true,
    );

    expect(prisma.roomMember.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', userId: 'user-1', status: { in: ['online'] } },
      data: {
        status: 'offline',
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it('멤버 상태를 left로 갱신할 때 leftAt과 lastSeenAt을 함께 갱신한다', async () => {
    const { prisma } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(
      repo.updateMemberStatus('room-1', 'user-1', 'left', ['online', 'offline']),
    ).resolves.toBe(true);

    expect(prisma.roomMember.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', userId: 'user-1', status: { in: ['online', 'offline'] } },
      data: {
        status: 'left',
        leftAt: expect.any(Date),
        lastSeenAt: expect.any(Date),
      },
    });
  });

  it('허용된 이전 상태가 아니면 전환되지 않고 false를 반환한다', async () => {
    const { prisma } = makePrisma();
    prisma.roomMember.updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repo = new RoomRepository(prisma);

    await expect(repo.updateMemberStatus('room-1', 'user-1', 'offline', ['online'])).resolves.toBe(
      false,
    );
  });

  it('left 상태도 포함해 단일 멤버 정보를 조회한다', async () => {
    const { prisma } = makePrisma({
      memberInfoResult: {
        id: 'member-1',
        userId: 'user-1',
        role: 'member',
        status: 'left',
        user: { nickname: 'Alice', profileImage: null },
      },
    });
    const repo = new RoomRepository(prisma);

    await expect(repo.findMemberInfo('room-1', 'user-1')).resolves.toEqual({
      id: 'member-1',
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: null,
      role: 'member',
      status: 'left',
    });

    expect(prisma.roomMember.findUnique).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        user: { select: { nickname: true, profileImage: true } },
      },
    });
  });

  it('단일 멤버 정보가 없으면 null을 반환한다', async () => {
    const { prisma } = makePrisma({ memberInfoResult: null });
    const repo = new RoomRepository(prisma);

    await expect(repo.findMemberInfo('room-1', 'user-1')).resolves.toBeNull();
  });

  it('Room을 닫고 갱신된 Room 레코드를 반환하며 left가 아닌 멤버를 left 처리한다', async () => {
    const { prisma, tx } = makePrisma();
    const repo = new RoomRepository(prisma);

    await expect(repo.closeRoom('room-1')).resolves.toMatchObject({ status: 'closed' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.room.update).toHaveBeenCalledWith({
      where: { id: 'room-1' },
      data: { status: 'closed', closedAt: expect.any(Date) },
      select: { id: true, name: true, status: true, closedAt: true, updatedAt: true },
    });
    expect(tx.roomMember.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1', status: { not: 'left' } },
      data: {
        status: 'left',
        leftAt: expect.any(Date),
        lastSeenAt: expect.any(Date),
      },
    });
  });
});
