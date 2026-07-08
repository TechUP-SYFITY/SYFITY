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

export type PlaybackPlayPayload = {
  roomId: string;
  currentTime: number;
};

export type PlaybackPausePayload = {
  roomId: string;
  currentTime: number;
};

export type PlaybackSeekPayload = {
  roomId: string;
  seekTime: number;
};

export type PlaybackChangeTrackPayload = {
  roomId: string;
  playlistItemId: string;
};

export type PlaybackErrorPayload = {
  roomId: string;
  videoId: string;
  errorCode: number;
};

export type PlaybackErrorBroadcastPayload = {
  videoId: string;
  errorCode: number;
};

export type PlaybackSyncRequestPayload = {
  roomId: string;
};

export type SocketAckError = {
  code: string;
  message: string;
};

export type PlaybackAck = { success: true } | { success: false; error: SocketAckError };

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

export type ChatSendPayload = {
  roomId: string;
  message: string;
};

export type ChatSendAck =
  | { success: true; data: { id: string; createdAt: string } }
  | { success: false; error: SocketAckError };

export type ChatReceivedPayload = {
  id: string;
  userId: string;
  nickname: string;
  profileImage: string | null;
  type: 'user';
  message: string;
  createdAt: string;
};

export type ChatSystemPayload = {
  id: string;
  type: 'system';
  message: string;
  createdAt: string;
};
