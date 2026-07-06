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

export type CreateRoomData = {
  name: string;
  hostId: string;
  inviteCode: string;
};

export type RoomMembershipRecord = {
  role: 'host' | 'member' | 'guest';
  status: 'online' | 'offline' | 'left';
};

export type RoomMemberRecord = {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: 'host' | 'member' | 'guest';
  status: 'online' | 'offline' | 'left';
};

export type PlaybackStateRecord = {
  videoId: string | null;
  playlistItemId: string | null;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt: Date | null;
  serverPausedAt: Date | null;
  updatedAt: Date;
};

export type PlaybackStateResult = {
  videoId: string | null;
  playlistItemId: string | null;
  currentTime: number;
  isPlaying: boolean;
  updatedAt: string;
};

export type JoinRoomResult = {
  room: RoomDetailRecord;
  playbackState: PlaybackStateResult;
  playlist: PlaylistItemRecord[];
  members: RoomMemberRecord[];
  recentChats: ChatRecord[];
};

export interface IRoomRepository {
  existsInviteCode(inviteCode: string): Promise<boolean>;
  createRoom(data: CreateRoomData): Promise<RoomRecord>;
  existsRoom(roomId: string): Promise<boolean>;
  findRoomById(roomId: string): Promise<RoomDetailRecord | null>;
  findRoomByInviteCode(inviteCode: string): Promise<RoomDetailRecord | null>;
  touchLastActivity(roomId: string): Promise<void>;
  findMembership(roomId: string, userId: string): Promise<RoomMembershipRecord | null>;
  upsertMembership(roomId: string, userId: string): Promise<void>;
  findMembers(roomId: string): Promise<RoomMemberRecord[]>;
  upsertRecentRoom(userId: string, roomId: string): Promise<void>;
  findPlaybackState(roomId: string): Promise<PlaybackStateRecord | null>;
}
