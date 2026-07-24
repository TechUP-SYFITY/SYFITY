import type { UserProfileRecord } from './user';

export type ProfileImageObjectRecord = {
  id: string;
  userId: string;
  path: string;
  status: 'pending' | 'current' | 'delete_pending';
  createdAt: Date;
};

export interface IProfileImageRepository {
  createPending(userId: string, path: string): Promise<void>;
  discardPending(userId: string, path: string): Promise<void>;
  confirmPending(
    userId: string,
    path: string,
    publicUrl: string,
  ): Promise<UserProfileRecord | null>;
  resetCurrent(userId: string): Promise<UserProfileRecord>;
  queueAllForDeletion(userId: string): Promise<void>;
  queueLegacyObjectForDeletion(userId: string, path: string): Promise<void>;
  findDeletePending(userId?: string): Promise<ProfileImageObjectRecord[]>;
  queueStalePendingForDeletion(cutoff: Date): Promise<void>;
  deleteObject(id: string): Promise<void>;
}
