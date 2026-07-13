'use client';

// Room의 YouTube 플레이어와 현재 재생 곡 정보를 표시한다.
import { AlertTriangle, Play } from 'lucide-react';

import { formatDuration } from '@/shared/lib/formatDuration';
import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { PlaylistItem } from '@/shared/types/domain';

import { playbackCommands } from './playbackCommands';
import { PlaybackSyncToast } from './PlaybackSyncToast';
import { usePlayerStore } from './playerStore';
import { YouTubePlayer } from './YouTubePlayer';

interface PlayerPanelProps {
  roomId: string;
  isHost: boolean;
  onEnded: () => void;
  onPlaybackStateChange: (isPlaying: boolean, currentTime: number) => void;
  playlist: PlaylistItem[];
}

export function PlayerPanel({
  roomId,
  isHost,
  onEnded,
  onPlaybackStateChange,
  playlist,
}: PlayerPanelProps) {
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playbackError = usePlayerStore((state) => state.playbackError);
  const beginPlaybackSync = usePlayerStore((state) => state.beginPlaybackSync);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const posterUrl = currentTrack ? getThumbnailUrl(currentTrack) : null;
  const shouldShowPoster = Boolean(posterUrl) && !playbackState?.isPlaying;

  function handleBufferingRecovered() {
    if (!playbackState?.videoId) {
      return;
    }

    beginPlaybackSync();
    try {
      playbackCommands.requestSync(roomId);
    } catch {
      clearPlaybackSync();
      // 자동 동기화 요청은 다음 서버 tick에서 다시 보정된다.
    }
  }

  function handlePlayerError(errorCode: number) {
    if (!isHost || !playbackState?.videoId) {
      return;
    }

    void playbackCommands
      .reportError(roomId, playbackState.videoId, errorCode)
      .catch(() => undefined);
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 xl:mx-0">
      <div className="relative overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-border">
        <YouTubePlayer
          playbackState={playbackState}
          onBufferingRecovered={handleBufferingRecovered}
          onEnded={onEnded}
          onError={handlePlayerError}
          onPlaybackStateChange={onPlaybackStateChange}
        />
        {shouldShowPoster ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="h-full w-full bg-cover bg-center opacity-80"
              style={{
                backgroundImage: `url(${posterUrl})`,
              }}
            />
            <div className="absolute inset-0 bg-linear-to-r from-background/50 via-foreground/5 to-accent/20" />
            <div className="absolute inset-0 bg-background/10" />
            <div className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/60 text-foreground">
              <Play className="h-6 w-6 translate-x-0.5" aria-hidden />
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute top-4 left-4 rounded-full bg-background/70 px-3 py-1 text-xs font-bold text-primary">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          LIVE SYNC
        </div>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-background/80 px-2 py-1 text-xs font-bold text-foreground">
          {currentTrack ? formatDuration(currentTrack.duration) : '0:00'}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-foreground">
            {currentTrack?.title ?? '재생 대기'}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {currentTrack?.channelTitle ?? '곡을 추가해보세요'}
          </p>
        </div>
        {!isHost ? (
          <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-400 xl:block">
            호스트 제어
          </span>
        ) : null}
      </div>

      <div className="min-h-5 space-y-1 text-sm text-muted-foreground">
        {playbackError ? (
          <p className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            재생할 수 없는 영상이에요. 오류 코드 {playbackError.errorCode}
          </p>
        ) : null}
      </div>
      <PlaybackSyncToast />
    </section>
  );
}

function getThumbnailUrl(track: PlaylistItem) {
  if (track.thumbnailUrl) {
    return track.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
}
