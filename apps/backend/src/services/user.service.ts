import { AppError } from '../errors/appError';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';

export class UserService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getMe(userId: string): Promise<UserProfileRecord> {
    const user = await this.userRepo.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'AUTH_USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  getRecentRooms(userId: string): Promise<RecentRoomRecord[]> {
    return this.userRepo.findRecentRooms(userId);
  }
}
