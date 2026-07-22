import { describe, expect, it, vi } from 'vitest';

import { UserRepository, type UserRepositoryPrisma } from './user.repository';
import type { RecentRoomRecord, UserProfileRecord } from '../types/user';

const userProfile: UserProfileRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: null,
};

const recentRoomRows = [
  {
    lastJoinedAt: new Date('2026-07-01T12:00:00.000Z'),
    room: {
      id: 'room-1',
      name: 'Morning Jazz',
      inviteCode: 'ABCD1234',
    },
  },
  {
    lastJoinedAt: new Date('2026-06-30T12:00:00.000Z'),
    room: {
      id: 'room-2',
      name: 'Night Drive',
      inviteCode: 'WXYZ5678',
    },
  },
];

const recentRooms: RecentRoomRecord[] = [
  {
    id: 'room-1',
    name: 'Morning Jazz',
    inviteCode: 'ABCD1234',
    lastJoinedAt: new Date('2026-07-01T12:00:00.000Z'),
  },
  {
    id: 'room-2',
    name: 'Night Drive',
    inviteCode: 'WXYZ5678',
    lastJoinedAt: new Date('2026-06-30T12:00:00.000Z'),
  },
];

function makePrisma(
  overrides: {
    findUniqueResult?: UserProfileRecord | null;
    findManyResult?: typeof recentRoomRows;
  } = {},
): UserRepositoryPrisma {
  const findUniqueResult =
    'findUniqueResult' in overrides ? overrides.findUniqueResult : userProfile;
  const findManyResult = 'findManyResult' in overrides ? overrides.findManyResult : recentRoomRows;

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(findUniqueResult),
      update: vi.fn(),
    },
    recentRoom: {
      findMany: vi.fn().mockResolvedValue(findManyResult),
    },
  } satisfies UserRepositoryPrisma;
}

describe('UserRepository', () => {
  it('id로 사용자 프로필을 조회한다', async () => {
    const prisma = makePrisma();
    const repo = new UserRepository(prisma);

    await expect(repo.findUserById('user-id')).resolves.toEqual(userProfile);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImage: true,
        onboardedAt: true,
      },
    });
  });

  it('사용자를 찾지 못하면 null을 반환한다', async () => {
    const prisma = makePrisma({ findUniqueResult: null });
    const repo = new UserRepository(prisma);

    await expect(repo.findUserById('missing-id')).resolves.toBe(null);
  });

  it('온보딩, 닉네임, 이미지 변경은 필요한 프로필 필드를 반환한다', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...userProfile,
      onboardedAt: new Date('2026-07-22T00:00:00.000Z'),
    } as never);
    const repo = new UserRepository(prisma);

    await repo.completeOnboarding('user-id', { nickname: 'New name' });
    await repo.updateNickname('user-id', 'Other name');
    await repo.updateProfileImage('user-id', 'https://cdn.example/image.png');

    expect(prisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'user-id' },
        data: { nickname: 'New name', onboardedAt: expect.any(Date) },
      }),
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { id: 'user-id' }, data: { nickname: 'Other name' } }),
    );
    expect(prisma.user.update).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: { id: 'user-id' },
        data: { profileImage: 'https://cdn.example/image.png' },
      }),
    );
  });

  it('탈퇴 사용자를 익명 정보와 비어 있는 인증 상태로 전환한다', async () => {
    const prisma = makePrisma();
    const repo = new UserRepository(prisma);

    await repo.anonymizeUser('user-id');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: expect.objectContaining({
        email: expect.stringMatching(/^deleted-.+@deleted\.syfity\.local$/),
        nickname: '탈퇴한 사용자',
        profileImage: null,
        refreshToken: null,
      }),
    });
  });

  it('최근 참여한 active 방 목록을 lastJoinedAt 내림차순으로 조회한다', async () => {
    const prisma = makePrisma();
    const repo = new UserRepository(prisma);

    await expect(repo.findRecentRooms('user-id')).resolves.toEqual(recentRooms);

    expect(prisma.recentRoom.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        room: {
          status: 'active',
          roomMembers: { none: { userId: 'user-id', status: 'kicked' } },
        },
      },
      select: {
        lastJoinedAt: true,
        room: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { lastJoinedAt: 'desc' },
    });
  });

  it('최근 방 조회 결과가 없으면 빈 배열을 반환한다', async () => {
    const prisma = makePrisma({ findManyResult: [] });
    const repo = new UserRepository(prisma);

    await expect(repo.findRecentRooms('user-id')).resolves.toEqual([]);
  });
});
