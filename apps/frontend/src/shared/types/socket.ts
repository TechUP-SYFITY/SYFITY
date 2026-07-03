// Socket.IO 이벤트 payload와 ack 타입을 정의한다.
import type { ApiError, SocketAck } from './api';
import type {
  ChatMessage,
  PlaybackState,
  PlaylistItem,
  RoomClosedReason,
  RoomMember,
} from './domain';

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomClosedPayload {
  roomId: string;
  reason: RoomClosedReason;
}

export interface RoomHostDisconnectedPayload {
  roomId: string;
  waitUntil: string;
}

export interface PlaybackCurrentTimePayload {
  roomId: string;
  currentTime: number;
}

export interface PlaybackSeekPayload {
  roomId: string;
  seekTime: number;
}

export interface PlaybackChangeTrackPayload {
  roomId: string;
  playlistItemId: string;
}

export interface PlaybackSyncRequestPayload {
  roomId: string;
}

export interface PlaybackErrorPayload {
  roomId: string;
  videoId: string;
  errorCode: number;
}

export interface PlaybackErrorBroadcastPayload {
  videoId: string;
  errorCode: number;
}

export interface PlaylistUpdatedPayload {
  playlist: PlaylistItem[];
}

export interface ChatSendPayload {
  roomId: string;
  message: string;
}

export interface ChatSendAckData {
  id: string;
  createdAt: string;
}

export interface ServerToClientEvents {
  'room:host-disconnected': (payload: RoomHostDisconnectedPayload) => void;
  'room:host-reconnected': (payload: RoomJoinPayload) => void;
  'room:closed': (payload: RoomClosedPayload) => void;
  'playback:play': (payload: PlaybackState) => void;
  'playback:pause': (payload: PlaybackState) => void;
  'playback:seek': (payload: PlaybackState) => void;
  'playback:change-track': (payload: PlaybackState) => void;
  'playback:tick': (payload: PlaybackState) => void;
  'playback:sync-response': (payload: PlaybackState) => void;
  'playback:error': (payload: PlaybackErrorBroadcastPayload) => void;
  'playlist:updated': (payload: PlaylistUpdatedPayload) => void;
  'chat:received': (payload: ChatMessage) => void;
  'chat:system': (payload: ChatMessage) => void;
  'presence:update': (payload: Omit<RoomMember, 'id'>) => void;
}

export interface ClientToServerEvents {
  'room:join': (
    payload: RoomJoinPayload,
    ack: (response: SocketAck<{ playbackState: PlaybackState }>) => void,
  ) => void;
  'room:leave': (payload: RoomJoinPayload) => void;
  'playback:play': (
    payload: PlaybackCurrentTimePayload,
    ack: (response: SocketAck) => void,
  ) => void;
  'playback:pause': (
    payload: PlaybackCurrentTimePayload,
    ack: (response: SocketAck) => void,
  ) => void;
  'playback:seek': (payload: PlaybackSeekPayload, ack: (response: SocketAck) => void) => void;
  'playback:change-track': (
    payload: PlaybackChangeTrackPayload,
    ack: (response: SocketAck) => void,
  ) => void;
  'playback:error': (payload: PlaybackErrorPayload, ack: (response: SocketAck) => void) => void;
  'playback:sync-request': (payload: PlaybackSyncRequestPayload) => void;
  'chat:send': (
    payload: ChatSendPayload,
    ack: (response: SocketAck<ChatSendAckData>) => void,
  ) => void;
}

export function createSocketError(error: ApiError): Error {
  return new Error(`${error.code}: ${error.message}`);
}
