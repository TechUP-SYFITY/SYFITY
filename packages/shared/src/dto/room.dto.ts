export type CreateRoomRequest = {
  /**
   * @minLength 1
   * @maxLength 50
   */
  name: string;
};

export type CreateRoomResponse = {
  success: true;
  data: {
    id: string;
    name: string;
    inviteCode: string;
    status: 'active';
    createdAt: string;
  };
};

export type CreateRoomMembershipRequest = {
  inviteCode: string;
};

export type CreateRoomMembershipResponse = {
  success: true;
  data: {
    room: {
      id: string;
      name: string;
      status: 'active' | 'inactive' | 'closed';
      inviteCode: string;
      hostId: string;
    };
  };
};

export type GetRoomResponse = {
  success: true;
  data: {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'closed';
    inviteCode: string;
    hostId: string;
    createdAt: string;
  };
};

export type UpdateRoomRequest =
  | {
      /**
       * @minLength 1
       * @maxLength 50
       */
      name: string;
    }
  | { status: 'closed' };

export type UpdateRoomResponse = {
  success: true;
  data: {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'closed';
    closedAt: string | null;
    updatedAt: string;
  };
};

export type RoomMemberSummary = {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: 'host' | 'member' | 'guest';
  status: 'online' | 'offline';
};

export type KickedRoomMember = {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  kickedAt: string;
};

export type GetActiveRoomMembersResponse = {
  success: true;
  data: { members: RoomMemberSummary[] };
};

export type GetKickedRoomMembersResponse = {
  success: true;
  data: { members: KickedRoomMember[] };
};

export type UpdateRoomMemberRequest = { status: 'kicked' } | { status: 'left' };

export type UpdateRoomMemberResponse = {
  success: true;
  data: { memberId: string; status: 'kicked' | 'left' };
};
