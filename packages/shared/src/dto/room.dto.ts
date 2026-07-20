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
