import { describe, expect, it, vi } from 'vitest';

import {
  ProfileImageRepository,
  type ProfileImageRepositoryPrisma,
} from './profile-image.repository';
import { Prisma } from '../generated/prisma/client';

const userProfile = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: 'https://cdn.example/new.png',
  onboardedAt: null,
  deletionPendingAt: null,
  deletedAt: null,
};

const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError('duplicate current image', {
  code: 'P2002',
  clientVersion: 'test',
});

function makePrisma(findFirstResult: { id: string } | null = { id: 'pending-object' }): {
  prisma: ProfileImageRepositoryPrisma;
  tx: {
    user: { update: ReturnType<typeof vi.fn> };
    profileImageObject: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
} {
  const tx = {
    user: { update: vi.fn().mockResolvedValue(userProfile) },
    profileImageObject: {
      findFirst: vi.fn().mockResolvedValue(findFirstResult),
      update: vi.fn().mockResolvedValue(undefined),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    user: { update: vi.fn() },
    profileImageObject: {
      create: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
    $transaction: vi.fn((fn) => fn(tx)),
  } satisfies ProfileImageRepositoryPrisma;
  return { prisma, tx };
}

describe('ProfileImageRepository', () => {
  it('업로드 URL 발급 전 pending 객체를 기록하고 발급 실패 시 해당 객체만 버린다', async () => {
    const { prisma } = makePrisma();
    const repo = new ProfileImageRepository(prisma);

    await repo.createPending('user-id', 'user-id/new.png');
    await repo.discardPending('user-id', 'user-id/new.png');

    expect(prisma.profileImageObject.create).toHaveBeenCalledWith({
      data: { userId: 'user-id', path: 'user-id/new.png', status: 'pending' },
    });
    expect(prisma.profileImageObject.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', path: 'user-id/new.png', status: 'pending' },
    });
  });

  it('pending 객체를 확정하면 기존 current는 삭제 대기로 바꾸고 프로필 URL을 함께 갱신한다', async () => {
    const { prisma, tx } = makePrisma();
    const repo = new ProfileImageRepository(prisma);

    await expect(
      repo.confirmPending('user-id', 'user-id/new.png', 'https://cdn.example/new.png'),
    ).resolves.toEqual(userProfile);

    expect(tx.profileImageObject.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-id', path: 'user-id/new.png', status: 'pending' },
      select: { id: true },
    });
    expect(tx.profileImageObject.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', status: 'current', id: { not: 'pending-object' } },
      data: { status: 'delete_pending' },
    });
    expect(tx.profileImageObject.update).toHaveBeenCalledWith({
      where: { id: 'pending-object' },
      data: { status: 'current' },
    });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id' },
        data: { profileImage: 'https://cdn.example/new.png' },
      }),
    );
  });

  it('확정되지 않았거나 다른 사용자의 경로는 프로필을 바꾸지 않는다', async () => {
    const { prisma, tx } = makePrisma(null);
    const repo = new ProfileImageRepository(prisma);

    await expect(
      repo.confirmPending('user-id', 'user-id/missing.png', 'https://cdn.example/missing.png'),
    ).resolves.toBeNull();
    expect(tx.profileImageObject.updateMany).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('동시 confirm의 current 객체 고유 제약 충돌은 재시도해 하나의 current만 남긴다', async () => {
    const { prisma, tx } = makePrisma();
    vi.mocked(prisma.$transaction)
      .mockRejectedValueOnce(uniqueConstraintError)
      .mockImplementation((fn) => fn(tx as never));
    const repo = new ProfileImageRepository(prisma);

    await expect(
      repo.confirmPending('user-id', 'user-id/new.png', 'https://cdn.example/new.png'),
    ).resolves.toEqual(userProfile);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.profileImageObject.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', status: 'current', id: { not: 'pending-object' } },
      data: { status: 'delete_pending' },
    });
    expect(tx.profileImageObject.update).toHaveBeenCalledWith({
      where: { id: 'pending-object' },
      data: { status: 'current' },
    });
  });

  it('초기화·탈퇴·만료 pending은 삭제 대기 상태로 전환한다', async () => {
    const { prisma } = makePrisma();
    const repo = new ProfileImageRepository(prisma);

    await repo.resetCurrent('user-id');
    await repo.queueAllForDeletion('user-id');
    await repo.queueLegacyObjectForDeletion('user-id', 'user-id/legacy.png');
    await repo.queueStalePendingForDeletion(new Date('2026-07-23T00:00:00.000Z'));

    expect(prisma.profileImageObject.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', status: { in: ['pending', 'current'] } },
      data: { status: 'delete_pending' },
    });
    expect(prisma.profileImageObject.upsert).toHaveBeenCalledWith({
      where: { path: 'user-id/legacy.png' },
      create: { userId: 'user-id', path: 'user-id/legacy.png', status: 'delete_pending' },
      update: { status: 'delete_pending' },
    });
    expect(prisma.profileImageObject.updateMany).toHaveBeenLastCalledWith({
      where: { status: 'pending', createdAt: { lte: new Date('2026-07-23T00:00:00.000Z') } },
      data: { status: 'delete_pending' },
    });
  });
});
