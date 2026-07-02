export type RoomRecord = {
  id: string;
  name: string;
  inviteCode: string;
  status: 'active' | 'inactive' | 'closed';
  createdAt: Date;
};

export type CreateRoomData = {
  name: string;
  hostId: string;
  inviteCode: string;
};

export interface IRoomRepository {
  existsInviteCode(inviteCode: string): Promise<boolean>;
  createRoom(data: CreateRoomData): Promise<RoomRecord>;
}
