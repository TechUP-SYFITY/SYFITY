/** playback:{roomId} 키에 저장되는 재생 상태 캐시 */
export type PlaybackStateCache = {
  videoId: string | null;
  playlistItemId: string | null;
  baseCurrentTime: number;
  isPlaying: boolean;
  serverStartedAt: string | null;
  serverPausedAt: string | null;
};

/** presence:{roomId} 키에 저장되는 참여자 온라인 상태 캐시 */
export type PresenceCache = Record<string, 'online' | 'offline'>;
