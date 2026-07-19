import type { ChatMessage, PlaylistItem } from '@syfity/shared';

import type { HostConnectionState, RoomMemberRecord, RoomMemberStatus, RoomRole } from './room';

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
  action: 'select' | 'next' | 'previous';
  playlistItemId?: string;
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

export type RoomJoinAck = { success: true } | { success: false; error: SocketAckError };

export type RoomJoinedPayload = {
  roomId: string;
  hostConnection: HostConnectionState;
  playbackState: PlaybackStatePayload;
  playbackPolicy: { repeatMode: 'off'; shuffleEnabled: false };
  playlist: PlaylistItem[];
  members: RoomMemberRecord[];
  recentChats: ChatMessage[];
};

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

export type RoomHostDisconnectedPayload = {
  roomId: string;
  waitUntil: string;
};

export type RoomHostReconnectedPayload = {
  roomId: string;
};

export type ChatSendPayload = {
  roomId: string;
  message: string;
};

export type ChatSendAck =
  { success: true; data: ChatMessage } | { success: false; error: SocketAckError };

export type ChatReceivedPayload = ChatMessage;
export type ChatSystemPayload = ChatMessage;
