export type UserRecord = {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface IAuthRepository {
  upsertUser(data: {
    email: string;
    nickname: string;
    profileImage: string | null;
  }): Promise<UserRecord>;
  findUserByRefreshToken(userId: string, refreshToken: string): Promise<UserRecord | null>;
  saveRefreshToken(userId: string, token: string): Promise<void>;
  clearRefreshToken(userId: string): Promise<void>;
}
