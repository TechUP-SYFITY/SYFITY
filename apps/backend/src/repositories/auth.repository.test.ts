import { describe, expect, it, vi } from 'vitest';

import { AuthRepository, type AuthRepositoryPrisma } from './auth.repository';
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
    const findUnique = vi.fn();
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
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
    const findUnique = vi.fn();
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
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
    const findUnique = vi.fn();
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
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
    const findUnique = vi.fn();
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
    const repo = new AuthRepository(prisma);

    await repo.clearRefreshToken('user-id');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { refreshToken: null },
    });
  });

  it('userId와 refreshToken이 일치하면 사용자를 반환한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue({ ...userRecord, refreshToken: 'refresh-token' });
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
    const repo = new AuthRepository(prisma);

    await expect(repo.findUserByRefreshToken('user-id', 'refresh-token')).resolves.toEqual({
      ...userRecord,
      refreshToken: 'refresh-token',
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'user-id' } });
  });

  it('사용자를 찾지 못하면 null을 반환한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
    const repo = new AuthRepository(prisma);

    await expect(repo.findUserByRefreshToken('missing-user-id', 'refresh-token')).resolves.toBe(
      null,
    );
  });

  it('저장된 refreshToken과 전달된 토큰이 다르면 null을 반환한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue({ ...userRecord, refreshToken: 'saved-token' });
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
    const repo = new AuthRepository(prisma);

    await expect(repo.findUserByRefreshToken('user-id', 'other-token')).resolves.toBe(null);
  });

  it('저장된 refreshToken이 null이면 null을 반환한다', async () => {
    const upsert = vi.fn();
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue(userRecord);
    const prisma = { user: { upsert, update, findUnique } } satisfies AuthRepositoryPrisma;
    const repo = new AuthRepository(prisma);

    await expect(repo.findUserByRefreshToken('user-id', 'refresh-token')).resolves.toBe(null);
  });
});
