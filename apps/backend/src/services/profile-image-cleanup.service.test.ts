import { describe, expect, it, vi } from 'vitest';

import { ProfileImageCleanupService } from './profile-image-cleanup.service';
import type { IProfileImageRepository } from '../types/profile-image';

function makeRepository(overrides: Partial<IProfileImageRepository> = {}): IProfileImageRepository {
  return {
    createPending: vi.fn(),
    discardPending: vi.fn(),
    confirmPending: vi.fn(),
    resetCurrent: vi.fn(),
    queueAllForDeletion: vi.fn(),
    queueLegacyObjectForDeletion: vi.fn(),
    findDeletePending: vi.fn().mockResolvedValue([]),
    queueStalePendingForDeletion: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ProfileImageCleanupService', () => {
  it('만료된 pending과 기존 삭제 대기 객체를 제거하고 실패 객체는 다음 실행을 위해 남긴다', async () => {
    const repo = makeRepository({
      findDeletePending: vi.fn().mockResolvedValue([
        {
          id: 'remove-me',
          userId: 'user-id',
          path: 'user-id/remove.png',
          status: 'delete_pending',
          createdAt: new Date(),
        },
        {
          id: 'retry-me',
          userId: 'user-id',
          path: 'user-id/retry.png',
          status: 'delete_pending',
          createdAt: new Date(),
        },
      ]),
    });
    const storage = {
      remove: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('storage unavailable')),
    };
    const service = new ProfileImageCleanupService(repo, storage);

    await expect(service.cleanup()).resolves.toEqual({ deletedCount: 1, failedCount: 1 });

    expect(repo.queueStalePendingForDeletion).toHaveBeenCalledWith(expect.any(Date));
    expect(storage.remove).toHaveBeenNthCalledWith(1, 'user-id/remove.png');
    expect(storage.remove).toHaveBeenNthCalledWith(2, 'user-id/retry.png');
    expect(repo.deleteObject).toHaveBeenCalledWith('remove-me');
    expect(repo.deleteObject).not.toHaveBeenCalledWith('retry-me');
  });
});
