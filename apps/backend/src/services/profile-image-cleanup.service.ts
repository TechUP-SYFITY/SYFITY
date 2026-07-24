import { logger } from '../lib/logger';
import type { IObjectStorage } from '../lib/storage/objectStorage.interface';
import type { IProfileImageRepository } from '../types/profile-image';

// Supabase signed upload URLs are valid for two hours. Keep the pending row a
// little longer so cleanup cannot remove it while a client can still upload.
export const PROFILE_IMAGE_SIGNED_UPLOAD_URL_TTL_MS = 2 * 60 * 60 * 1000;
const PENDING_UPLOAD_CLEANUP_BUFFER_MS = 5 * 60 * 1000;
const PENDING_UPLOAD_MAX_AGE_MS =
  PROFILE_IMAGE_SIGNED_UPLOAD_URL_TTL_MS + PENDING_UPLOAD_CLEANUP_BUFFER_MS;

export class ProfileImageCleanupService {
  constructor(
    private readonly profileImageRepo: IProfileImageRepository,
    private readonly storageClient: Pick<IObjectStorage, 'remove'>,
  ) {}

  async cleanup(): Promise<{ deletedCount: number; failedCount: number }> {
    const cutoff = new Date(Date.now() - PENDING_UPLOAD_MAX_AGE_MS);
    await this.profileImageRepo.queueStalePendingForDeletion(cutoff);

    let deletedCount = 0;
    let failedCount = 0;
    for (const image of await this.profileImageRepo.findDeletePending()) {
      try {
        await this.storageClient.remove(image.path);
        await this.profileImageRepo.deleteObject(image.id);
        deletedCount += 1;
      } catch (error) {
        failedCount += 1;
        logger.warn(
          { err: error, path: image.path },
          '[ProfileImageCleanupService] 삭제 재시도 실패',
        );
      }
    }

    logger.info({ deletedCount, failedCount }, '[ProfileImageCleanupService] 실행 완료');
    return { deletedCount, failedCount };
  }
}
