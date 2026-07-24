import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '../generated/prisma/client';
import type { IAccountDeletionRepository } from '../types/account-deletion';
import { extractStoragePath } from '../utils/extractStoragePath';

type AccountDeletionTransactionClient = {
  user: Pick<PrismaClient['user'], 'findUnique' | 'update'>;
  room: Pick<PrismaClient['room'], 'findMany' | 'updateMany'>;
  personalPlaylist: Pick<PrismaClient['personalPlaylist'], 'deleteMany'>;
  profileImageObject: Pick<PrismaClient['profileImageObject'], 'updateMany' | 'upsert'>;
};

export type AccountDeletionRepositoryPrisma = {
  $transaction: <T>(fn: (tx: AccountDeletionTransactionClient) => Promise<T>) => Promise<T>;
};

export class AccountDeletionRepository implements IAccountDeletionRepository {
  constructor(private readonly prisma: AccountDeletionRepositoryPrisma) {}

  async finalizeDeletion(
    userId: string,
    profileImageBucket: string,
  ): Promise<{ closedRoomIds: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { profileImage: true },
      });
      const profileImagePath = user?.profileImage
        ? extractStoragePath(user.profileImage, profileImageBucket)
        : null;

      if (profileImagePath) {
        await tx.profileImageObject.upsert({
          where: { path: profileImagePath },
          create: { userId, path: profileImagePath, status: 'delete_pending' },
          update: { status: 'delete_pending' },
        });
      }
      await tx.profileImageObject.updateMany({
        where: { userId, status: { in: ['pending', 'current'] } },
        data: { status: 'delete_pending' },
      });

      const activeRooms = await tx.room.findMany({
        where: { hostId: userId, status: 'active' },
        select: { id: true },
      });
      const closedRoomIds = activeRooms.map((room) => room.id);
      const now = new Date();
      if (closedRoomIds.length > 0) {
        await tx.room.updateMany({
          where: { id: { in: closedRoomIds }, status: 'active' },
          data: { status: 'closed', closedAt: now },
        });
      }

      await tx.personalPlaylist.deleteMany({ where: { ownerId: userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${randomUUID()}@deleted.syfity.local`,
          nickname: '탈퇴한 사용자',
          profileImage: null,
          refreshToken: null,
          deletionPendingAt: null,
          deletedAt: now,
        },
      });

      return { closedRoomIds };
    });
  }
}
