import { isDriverAdapterError } from '@prisma/driver-adapter-utils';

import { Prisma, type PrismaClient } from '../generated/prisma/client';
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

const CONFIRM_MAX_ATTEMPTS = 3;

function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  return isDriverAdapterError(error) && error.cause.kind === 'TransactionWriteConflict';
}

function isUniqueConstraintFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

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
  $transaction: <T>(
    fn: (tx: ProfileImageTransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ) => Promise<T>;
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
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
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
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (
          attempt >= CONFIRM_MAX_ATTEMPTS ||
          (!isSerializationFailure(error) && !isUniqueConstraintFailure(error))
        ) {
          throw error;
        }
      }
    }
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
