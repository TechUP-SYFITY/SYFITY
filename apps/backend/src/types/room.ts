import type { ChatRecord } from './chat';
import type { PlaylistItemRecord } from './playlist';

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
  createdAt: Date;
};

export type RoomUpdateRecord = {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'closed';
  closedAt: Date | null;
  updatedAt: Date;
};

export type CreateRoomData = {
  name: string;
  hostId: string;
  inviteCode: string;
};

export type RoomRole = 'host' | 'member' | 'guest';
export type RoomMemberStatus = 'online' | 'offline' | 'left';
export type HostConnectionState =
  { status: 'connected' } | { status: 'disconnected'; waitUntil: string };

export type RoomMembershipRecord = {
  role: RoomRole;
  status: RoomMemberStatus;
};

export type RoomMemberRecord = {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: RoomRole;
  status: RoomMemberStatus;
};

export type CreateMembershipResult = {
  room: RoomDetailRecord;
  isNewMembership: boolean;
};

export type RoomSnapshotResult = {
  playlist: PlaylistItemRecord[];
  members: RoomMemberRecord[];
  recentChats: ChatRecord[];
};

export type LeaveRoomResult =
  { type: 'closed' } | { type: 'left'; member: RoomMemberRecord } | { type: 'noop' };

export interface IRoomRepository {
  existsInviteCode(inviteCode: string): Promise<boolean>;
  createRoom(data: CreateRoomData): Promise<RoomRecord>;
  existsRoom(roomId: string): Promise<boolean>;
  findRoomById(roomId: string): Promise<RoomDetailRecord | null>;
  findRoomByInviteCode(inviteCode: string): Promise<RoomDetailRecord | null>;
  touchLastActivity(roomId: string): Promise<void>;
  findMembership(roomId: string, userId: string): Promise<RoomMembershipRecord | null>;
  upsertMembership(roomId: string, userId: string): Promise<boolean>;
  findMembers(roomId: string): Promise<RoomMemberRecord[]>;
  upsertRecentRoom(userId: string, roomId: string): Promise<void>;
  updateMemberStatus(
    roomId: string,
    userId: string,
    status: RoomMemberStatus,
    fromStatuses: RoomMemberStatus[],
  ): Promise<boolean>;
  findMemberInfo(roomId: string, userId: string): Promise<RoomMemberRecord | null>;
  closeRoom(roomId: string): Promise<RoomUpdateRecord>;
  updateRoomName(roomId: string, name: string): Promise<RoomUpdateRecord>;
}
