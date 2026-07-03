// Room, Playlist, Playback에서 함께 쓰는 도메인 타입을 정의한다.
export type RoomStatus = 'active' | 'inactive' | 'closed';
export type RoomRole = 'host' | 'member' | 'guest';
export type RoomMemberStatus = 'online' | 'offline' | 'left';
export type PlaylistItemStatus = 'available' | 'unavailable';
export type ChatMessageType = 'user' | 'system';
export type RoomClosedReason = 'host-left' | 'host-timeout' | 'host-closed';

export interface RoomSummary {
  id: string;
  name: string;
  inviteCode: string;
  lastJoinedAt: string;
}

export interface RoomDetail {
  id: string;
  name: string;
  status: RoomStatus;
  inviteCode: string;
  hostId: string;
  createdAt?: string;
}

export interface PlaybackState {
  videoId: string | null;
  playlistItemId: string | null;
  currentTime: number;
  isPlaying: boolean;
  updatedAt?: string;
}

export interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  position: number;
  addedBy: string;
  status: PlaylistItemStatus;
}

export interface RoomMember {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: RoomRole;
  status: RoomMemberStatus;
}

export interface ChatMessage {
  id: string;
  userId: string | null;
  nickname: string | null;
  profileImage?: string | null;
  type: ChatMessageType;
  message: string;
  createdAt: string;
}

export interface JoinedRoomData {
  room: RoomDetail;
  playbackState: PlaybackState;
  playlist: PlaylistItem[];
  members: RoomMember[];
  recentChats: ChatMessage[];
}
