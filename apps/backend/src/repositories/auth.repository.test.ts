import { describe, expect, it, vi } from 'vitest';

import { AuthRepository } from './auth.repository';
import type { PrismaClient } from '../generated/prisma/client';
import type { UserRecord } from '../types/auth';

const userRecord: UserRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: null,
  refreshToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AuthRepository', () => {
  it('email 기준으로 사용자를 upsert한다', async () => {
    const upsert = vi.fn().mockResolvedValue(userRecord);
    const update = vi.fn();
    const prisma = { user: { upsert, update } } as unknown as PrismaClient;
    const repo = new AuthRepository(prisma);

    await expect(
      repo.upsertUser({
        email: 'alice@example.com',
        nickname: 'Alice',
        profileImage: null,
      }),
    ).resolves.toEqual(userRecord);

    expect(upsert).toHaveBeenCalledWith({
      where: { email: 'alice@example.com' },
      update: {
        nickname: 'Alice',
        profileImage: null,
      },
      create: {
        email: 'alice@example.com',
        nickname: 'Alice',
        profileImage: null,
      },
    });
  });

  it('기존 사용자의 nickname과 profileImage를 update 필드에 포함한다', async () => {
    const upsert = vi.fn().mockResolvedValue({ ...userRecord, nickname: 'Alice Updated' });
    const update = vi.fn();
    const prisma = { user: { upsert, update } } as unknown as PrismaClient;
    const repo = new AuthRepository(prisma);

    await repo.upsertUser({
      email: 'alice@example.com',
      nickname: 'Alice Updated',
      profileImage: 'https://example.com/alice.png',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'alice@example.com' },
        update: {
          nickname: 'Alice Updated',
          profileImage: 'https://example.com/alice.png',
        },
      }),
    );
  });

  it('refreshToken을 저장한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn().mockResolvedValue(userRecord);
    const prisma = { user: { upsert, update } } as unknown as PrismaClient;
    const repo = new AuthRepository(prisma);

    await repo.saveRefreshToken('user-id', 'refresh-token');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { refreshToken: 'refresh-token' },
    });
  });

  it('refreshToken을 초기화한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn().mockResolvedValue(userRecord);
    const prisma = { user: { upsert, update } } as unknown as PrismaClient;
    const repo = new AuthRepository(prisma);

    await repo.clearRefreshToken('user-id');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { refreshToken: null },
    });
  });
});
