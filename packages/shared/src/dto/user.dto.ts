export type UserProfileResponse = {
  success: true;
  data: {
    id: string;
    email: string;
    nickname: string;
    profileImage: string | null;
  };
};

export type RecentRoomsResponse = {
  success: true;
  data: {
    rooms: {
      id: string;
      name: string;
      inviteCode: string;
      lastJoinedAt: string;
    }[];
  };
};
