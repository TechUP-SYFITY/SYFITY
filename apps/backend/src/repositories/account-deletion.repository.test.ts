import { describe, expect, it, vi } from 'vitest';

import {
  AccountDeletionRepository,
  type AccountDeletionRepositoryPrisma,
} from './account-deletion.repository';

function makePrisma() {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        profileImage:
          'https://project.supabase.co/storage/v1/object/public/profile-images/user-id/current.png',
      }),
      update: vi.fn().mockResolvedValue(undefined),
    },
    room: {
      findMany: vi.fn().mockResolvedValue([{ id: 'active-room' }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    personalPlaylist: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    profileImageObject: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  };
  const prisma = {
    $transaction: vi.fn((fn) => fn(tx)),
  } satisfies AccountDeletionRepositoryPrisma;
  return { prisma, tx };
}

describe('AccountDeletionRepository', () => {
  it('Room·개인 재생목록·프로필 이미지 객체·사용자 익명화를 하나의 트랜잭션에서 확정한다', async () => {
    const { prisma, tx } = makePrisma();
    const repository = new AccountDeletionRepository(prisma);

    await expect(repository.finalizeDeletion('user-id', 'profile-images')).resolves.toEqual({
      closedRoomIds: ['active-room'],
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.profileImageObject.upsert).toHaveBeenCalledWith({
      where: { path: 'user-id/current.png' },
      create: { userId: 'user-id', path: 'user-id/current.png', status: 'delete_pending' },
      update: { status: 'delete_pending' },
    });
    expect(tx.profileImageObject.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', status: { in: ['pending', 'current'] } },
      data: { status: 'delete_pending' },
    });
    expect(tx.room.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['active-room'] }, status: 'active' },
      data: { status: 'closed', closedAt: expect.any(Date) },
    });
    expect(tx.personalPlaylist.deleteMany).toHaveBeenCalledWith({ where: { ownerId: 'user-id' } });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: expect.objectContaining({
        email: expect.stringMatching(/^deleted-.+@deleted\.syfity\.local$/),
        nickname: '탈퇴한 사용자',
        profileImage: null,
        refreshToken: null,
        deletionPendingAt: null,
        deletedAt: expect.any(Date),
      }),
    });
  });

  it('외부 프로필 이미지와 닫힌 Room은 건드리지 않는다', async () => {
    const { prisma, tx } = makePrisma();
    tx.user.findUnique.mockResolvedValue({
      profileImage: 'https://lh3.googleusercontent.com/avatar',
    });
    tx.room.findMany.mockResolvedValue([]);
    const repository = new AccountDeletionRepository(prisma);

    await expect(repository.finalizeDeletion('user-id', 'profile-images')).resolves.toEqual({
      closedRoomIds: [],
    });

    expect(tx.profileImageObject.upsert).not.toHaveBeenCalled();
    expect(tx.room.updateMany).not.toHaveBeenCalled();
  });

  it('트랜잭션 중 개인 재생목록 삭제가 실패하면 이후 사용자 익명화를 시도하지 않는다', async () => {
    const { prisma, tx } = makePrisma();
    tx.personalPlaylist.deleteMany.mockRejectedValue(new Error('database unavailable'));
    const repository = new AccountDeletionRepository(prisma);

    await expect(repository.finalizeDeletion('user-id', 'profile-images')).rejects.toThrow(
      'database unavailable',
    );

    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
