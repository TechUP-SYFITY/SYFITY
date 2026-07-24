import { describe, expect, it, vi } from 'vitest';

import {
  ProfileImageCleanupService,
  PROFILE_IMAGE_SIGNED_UPLOAD_URL_TTL_MS,
} from './profile-image-cleanup.service';
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
  it('서명 업로드 URL이 유효한 1시간·2시간 시점에는 pending 객체를 만료 처리하지 않는다', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-07-24T00:00:00.000Z');
    vi.setSystemTime(now);
    const repo = makeRepository();
    const service = new ProfileImageCleanupService(repo, { remove: vi.fn() });

    await service.cleanup();

    const cutoff = vi.mocked(repo.queueStalePendingForDeletion).mock.calls[0]?.[0];
    expect(PROFILE_IMAGE_SIGNED_UPLOAD_URL_TTL_MS).toBe(2 * 60 * 60 * 1000);
    expect(cutoff).toEqual(new Date('2026-07-23T21:55:00.000Z'));
    expect(cutoff!.getTime()).toBeLessThan(now.getTime() - PROFILE_IMAGE_SIGNED_UPLOAD_URL_TTL_MS);
    vi.useRealTimers();
  });

  it('서명 URL 만료 뒤 여유 시간이 지난 pending만 정리 대상으로 넘긴다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T00:05:00.000Z'));
    const repo = makeRepository();
    const service = new ProfileImageCleanupService(repo, { remove: vi.fn() });

    await service.cleanup();

    expect(repo.queueStalePendingForDeletion).toHaveBeenCalledWith(
      new Date('2026-07-23T22:00:00.000Z'),
    );
    vi.useRealTimers();
  });

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
