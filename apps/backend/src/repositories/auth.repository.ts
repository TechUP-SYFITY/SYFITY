import type { PrismaClient } from '../generated/prisma/client';
import type { IAuthRepository, UserRecord } from '../types/auth';

export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  upsertUser(data: {
    email: string;
    nickname: string;
    profileImage: string | null;
  }): Promise<UserRecord> {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        nickname: data.nickname,
        profileImage: data.profileImage,
      },
      create: {
        email: data.email,
        nickname: data.nickname,
        profileImage: data.profileImage,
      },
    });
  }

  async saveRefreshToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
