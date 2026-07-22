export type UserProfileRecord = {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  onboardedAt?: Date | null;
};

export type RecentRoomRecord = {
  id: string;
  name: string;
  inviteCode: string;
  lastJoinedAt: Date;
};

export interface IUserRepository {
  findUserById(userId: string): Promise<UserProfileRecord | null>;
  findRecentRooms(userId: string): Promise<RecentRoomRecord[]>;
  completeOnboarding(
    userId: string,
    data: { nickname: string },
  ): Promise<UserProfileRecord & { onboardedAt: Date }>;
  updateNickname(userId: string, nickname: string): Promise<UserProfileRecord>;
  updateProfileImage(userId: string, profileImage: string | null): Promise<UserProfileRecord>;
  anonymizeUser(userId: string): Promise<void>;
}
