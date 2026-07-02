export type UserProfileRecord = {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
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
}
