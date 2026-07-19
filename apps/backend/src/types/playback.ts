import type { PlaylistItem } from '@syfity/shared';

import type { PlaybackErrorBroadcastPayload } from './socket';

export type PlaybackStateRecord = {
  videoId: string | null;
  playlistItemId: string | null;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt: Date | null;
  serverPausedAt: Date | null;
  updatedAt: Date;
};

export type PlaybackStateUpdateData = {
  videoId: string | null;
  playlistItemId: string | null;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt: Date | null;
  serverPausedAt: Date | null;
};

export interface IPlaybackRepository {
  findByRoomId(roomId: string): Promise<PlaybackStateRecord | null>;
  updateState(roomId: string, data: PlaybackStateUpdateData): Promise<PlaybackStateRecord>;
}

export type PlaybackErrorResult = {
  errorPayload: PlaybackErrorBroadcastPayload;
  playlist: PlaylistItem[] | null;
};
