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
