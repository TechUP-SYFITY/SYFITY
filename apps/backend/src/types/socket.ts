import type { RoomMemberStatus, RoomRole } from './room';

export type RoomJoinPayload = {
  roomId: string;
};

export type RoomLeavePayload = {
  roomId: string;
};

export type PlaybackStatePayload = {
  currentTime: number;
  isPlaying: boolean;
  videoId: string | null;
  playlistItemId: string | null;
};

export type SocketAckError = {
  code: string;
  message: string;
};

export type RoomJoinAck =
  | { success: true; data: { playbackState: PlaybackStatePayload } }
  | { success: false; error: SocketAckError };

export type PresenceUpdatePayload = {
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: RoomRole;
  status: RoomMemberStatus;
};

export type RoomClosedReason = 'host-left' | 'host-timeout' | 'host-closed';

export type RoomClosedPayload = {
  roomId: string;
  reason: RoomClosedReason;
};
