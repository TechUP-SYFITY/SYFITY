import type { PlaylistItem } from '@syfity/shared';

export type RepeatMode = 'off' | 'all' | 'one';

export type PlaybackSession = {
  videoId: string | null;
  playlistItemId: string | null;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt: string | null;
  serverPausedAt: string | null;
  playbackVersion: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  shuffleCycle: number;
  remainingPlaylistItemIds: string[];
  playbackHistoryItemIds: string[];
};

export type PlaybackStatePayload = {
  videoId: string | null;
  playlistItemId: string | null;
  currentTime: number;
  isPlaying: boolean;
  playbackVersion: number;
};

export type PlaybackPolicyPayload = Pick<PlaybackSession, 'repeatMode' | 'shuffleEnabled'>;

export type PlaybackTransitionResult = {
  payload: PlaybackStatePayload;
  broadcastEvent: 'playback:play' | 'playback:pause' | 'playback:change-track' | 'playback:seek';
};

export type PlaybackErrorBroadcastPayload = {
  videoId: string;
  errorCode: number;
};

export type PlaybackErrorResult = {
  errorPayload: PlaybackErrorBroadcastPayload;
  playlist: PlaylistItem[] | null;
  transition: PlaybackTransitionResult | null;
};
