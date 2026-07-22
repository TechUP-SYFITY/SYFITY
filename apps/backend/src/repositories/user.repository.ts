import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '../generated/prisma/client';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';

export type UserRepositoryPrisma = {
  user: Pick<PrismaClient['user'], 'findUnique' | 'update'>;
  recentRoom: Pick<PrismaClient['recentRoom'], 'findMany'>;
};

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: UserRepositoryPrisma) {}

  findUserById(userId: string): Promise<UserProfileRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImage: true,
        onboardedAt: true,
      },
    });
  }

  completeOnboarding(
    userId: string,
    data: { nickname: string },
  ): Promise<UserProfileRecord & { onboardedAt: Date }> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname: data.nickname, onboardedAt: new Date() },
      select: { id: true, email: true, nickname: true, profileImage: true, onboardedAt: true },
    }) as Promise<UserProfileRecord & { onboardedAt: Date }>;
  }

  updateNickname(userId: string, nickname: string): Promise<UserProfileRecord> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { nickname },
      select: { id: true, email: true, nickname: true, profileImage: true, onboardedAt: true },
    });
  }

  updateProfileImage(userId: string, profileImage: string | null): Promise<UserProfileRecord> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImage },
      select: { id: true, email: true, nickname: true, profileImage: true, onboardedAt: true },
    });
  }

  async anonymizeUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${randomUUID()}@deleted.syfity.local`,
        nickname: '탈퇴한 사용자',
        profileImage: null,
        refreshToken: null,
      },
    });
  }

  async findRecentRooms(userId: string): Promise<RecentRoomRecord[]> {
    const records = await this.prisma.recentRoom.findMany({
      where: {
        userId,
        room: {
          status: 'active',
          roomMembers: { none: { userId, status: 'kicked' } },
        },
      },
      select: {
        lastJoinedAt: true,
        room: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { lastJoinedAt: 'desc' },
    });

    return records.map((record) => ({
      id: record.room.id,
      name: record.room.name,
      inviteCode: record.room.inviteCode,
      lastJoinedAt: record.lastJoinedAt,
    }));
  }
}
