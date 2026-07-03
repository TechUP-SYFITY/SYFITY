export type RoomRecord = {
  id: string;
  name: string;
  inviteCode: string;
  status: 'active' | 'inactive' | 'closed';
  createdAt: Date;
};

export type RoomDetailRecord = {
  id: string;
  name: string;
  hostId: string;
  status: 'active' | 'inactive' | 'closed';
  inviteCode: string;
};

export type CreateRoomData = {
  name: string;
  hostId: string;
  inviteCode: string;
};

export interface IRoomRepository {
  existsInviteCode(inviteCode: string): Promise<boolean>;
  createRoom(data: CreateRoomData): Promise<RoomRecord>;
  existsRoom(roomId: string): Promise<boolean>;
  findRoomById(roomId: string): Promise<RoomDetailRecord | null>;
  touchLastActivity(roomId: string): Promise<void>;
}
