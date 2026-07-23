import type { PrismaClient } from '../generated/prisma/client';
import type { IProfileImageRepository, ProfileImageObjectRecord } from '../types/profile-image';
import type { UserProfileRecord } from '../types/user';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  nickname: true,
  profileImage: true,
  onboardedAt: true,
  deletionPendingAt: true,
  deletedAt: true,
} as const;

const OBJECT_SELECT = {
  id: true,
  userId: true,
  path: true,
  status: true,
  createdAt: true,
} as const;

type ProfileImageTransactionClient = {
  user: Pick<PrismaClient['user'], 'update'>;
  profileImageObject: Pick<
    PrismaClient['profileImageObject'],
    'findFirst' | 'update' | 'updateMany'
  >;
};

export type ProfileImageRepositoryPrisma = {
  user: Pick<PrismaClient['user'], 'update'>;
  profileImageObject: Pick<
    PrismaClient['profileImageObject'],
    'create' | 'delete' | 'deleteMany' | 'findMany' | 'updateMany' | 'upsert'
  >;
  $transaction: <T>(fn: (tx: ProfileImageTransactionClient) => Promise<T>) => Promise<T>;
};

export class ProfileImageRepository implements IProfileImageRepository {
  constructor(private readonly prisma: ProfileImageRepositoryPrisma) {}

  async createPending(userId: string, path: string): Promise<void> {
    await this.prisma.profileImageObject.create({ data: { userId, path, status: 'pending' } });
  }

  async discardPending(userId: string, path: string): Promise<void> {
    await this.prisma.profileImageObject.deleteMany({
      where: { userId, path, status: 'pending' },
    });
  }

  async confirmPending(
    userId: string,
    path: string,
    publicUrl: string,
  ): Promise<UserProfileRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      const object = await tx.profileImageObject.findFirst({
        where: { userId, path, status: 'pending' },
        select: { id: true },
      });
      if (!object) return null;

      await tx.profileImageObject.updateMany({
        where: { userId, status: 'current', id: { not: object.id } },
        data: { status: 'delete_pending' },
      });
      await tx.profileImageObject.update({
        where: { id: object.id },
        data: { status: 'current' },
      });
      return tx.user.update({
        where: { id: userId },
        data: { profileImage: publicUrl },
        select: USER_PROFILE_SELECT,
      });
    });
  }

  async resetCurrent(userId: string): Promise<UserProfileRecord> {
    return this.prisma.$transaction(async (tx) => {
      await tx.profileImageObject.updateMany({
        where: { userId, status: 'current' },
        data: { status: 'delete_pending' },
      });
      return tx.user.update({
        where: { id: userId },
        data: { profileImage: null },
        select: USER_PROFILE_SELECT,
      });
    });
  }

  async queueAllForDeletion(userId: string): Promise<void> {
    await this.prisma.profileImageObject.updateMany({
      where: { userId, status: { in: ['pending', 'current'] } },
      data: { status: 'delete_pending' },
    });
  }

  async queueLegacyObjectForDeletion(userId: string, path: string): Promise<void> {
    await this.prisma.profileImageObject.upsert({
      where: { path },
      create: { userId, path, status: 'delete_pending' },
      update: { status: 'delete_pending' },
    });
  }

  findDeletePending(userId?: string): Promise<ProfileImageObjectRecord[]> {
    return this.prisma.profileImageObject.findMany({
      where: { status: 'delete_pending', ...(userId ? { userId } : {}) },
      orderBy: { createdAt: 'asc' },
      select: OBJECT_SELECT,
    });
  }

  async queueStalePendingForDeletion(cutoff: Date): Promise<void> {
    await this.prisma.profileImageObject.updateMany({
      where: { status: 'pending', createdAt: { lte: cutoff } },
      data: { status: 'delete_pending' },
    });
  }

  async deleteObject(id: string): Promise<void> {
    await this.prisma.profileImageObject.delete({ where: { id } });
  }
}
