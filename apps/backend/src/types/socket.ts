import type { ChatMessage, PlaylistItem } from '@syfity/shared';

import type { PlaybackPolicyPayload, PlaybackStatePayload, RepeatMode } from './playback';
import type { HostConnectionState, RoomMemberRecord, RoomRole } from './room';

export type RoomJoinPayload = {
  roomId: string;
};

export type RoomLeavePayload = {
  roomId: string;
};

export type { PlaybackStatePayload } from './playback';
export type { PlaybackErrorBroadcastPayload } from './playback';

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

export type PlaybackUpdateSettingsPayload = {
  roomId: string;
  repeatMode?: RepeatMode;
  shuffleEnabled?: boolean;
};

export type PlaybackSettingsPayload = PlaybackPolicyPayload & { playbackVersion: number };

export type PlaybackEndedPayload = {
  roomId: string;
  playlistItemId: string;
  playbackVersion: number;
};

export type PlaybackResetPayload = {
  roomId: string;
  reason: 'cache-reset';
  playbackState: PlaybackStatePayload;
  playbackPolicy: PlaybackPolicyPayload;
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
  playbackPolicy: PlaybackPolicyPayload;
  playlist: PlaylistItem[];
  members: RoomMemberRecord[];
  recentChats: ChatMessage[];
};

export type PresenceUpdatePayload = {
  userId: string;
  nickname: string;
  profileImage: string | null;
  role: RoomRole;
  status: 'online' | 'offline' | 'left';
};

export type RoomKickedPayload = {
  roomId: string;
  message: 'Host에 의해 Room에서 추방되었습니다.';
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
