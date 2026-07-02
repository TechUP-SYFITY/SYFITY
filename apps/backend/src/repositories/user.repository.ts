import type { PrismaClient } from '../generated/prisma/client';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';

export type UserRepositoryPrisma = {
  user: Pick<PrismaClient['user'], 'findUnique'>;
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
      },
    });
  }

  async findRecentRooms(userId: string): Promise<RecentRoomRecord[]> {
    const records = await this.prisma.recentRoom.findMany({
      where: {
        userId,
        room: { status: 'active' },
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
