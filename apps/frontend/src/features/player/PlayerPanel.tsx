'use client';

// Room의 YouTube 플레이어와 현재 재생 곡 정보를 표시한다.
import { AlertTriangle, Loader2, Pause, Play, Radio, RefreshCcw, SkipForward } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { PlaylistItem } from '@/shared/types/domain';

import { playbackCommands } from './playbackCommands';
import { usePlayerStore } from './playerStore';
import { usePlayerControls } from './usePlayerControls';
import { YouTubePlayer } from './YouTubePlayer';

interface PlayerPanelProps {
  roomId: string;
  isHost: boolean;
  playlist: PlaylistItem[];
}

export function PlayerPanel({ roomId, isHost, playlist }: PlayerPanelProps) {
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playbackError = usePlayerStore((state) => state.playbackError);
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const posterUrl = currentTrack ? getThumbnailUrl(currentTrack) : null;
  const shouldShowPoster = Boolean(posterUrl) && !playbackState?.isPlaying;
  const currentIndex = currentTrack
    ? playlist.findIndex((item) => item.id === currentTrack.id)
    : -1;
  const nextItem = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;
  const isPlaying = playbackState?.isPlaying ?? false;
  const currentTime = playbackState?.currentTime ?? 0;
  const hasPlayableTrack = Boolean(currentTrack && playbackState?.videoId);
  const {
    commandError,
    controlDisabled,
    handleNextTrack,
    handlePlayPause,
    handleSyncRequest,
    pendingCommand,
    syncDisabled,
    syncStatus,
  } = usePlayerControls({
    currentTime,
    hasPlayableTrack,
    isHost,
    isPlaying,
    nextItemId: nextItem?.id,
    roomId,
  });

  function handlePlayerError(errorCode: number) {
    if (!isHost || !playbackState?.videoId) {
      return;
    }

    void playbackCommands.reportError(roomId, playbackState.videoId, errorCode);
  }

  return (
    <section className="mx-auto flex w-full max-w-[760px] flex-col gap-4 lg:mx-0 lg:max-w-none">
      <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0c] shadow-[0_0_48px_rgba(114,244,164,0.06),0_0_0_1px_rgba(255,255,255,0.06)]">
        <YouTubePlayer
          playbackState={playbackState}
          onBufferingRecovered={handleSyncRequest}
          onEnded={isHost ? handleNextTrack : () => undefined}
          onError={handlePlayerError}
        />
        {shouldShowPoster ? (
          <div className="pointer-events-none absolute inset-0">
            <div
              className="h-full w-full bg-cover bg-center opacity-80"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(12,16,25,0.45), rgba(255,255,255,0.08) 48%, rgba(145,35,35,0.4)), radial-gradient(circle at 26% 68%, rgba(104,180,220,0.55), transparent 32%), radial-gradient(circle at 70% 62%, rgba(238,74,67,0.62), transparent 30%), radial-gradient(circle at 52% 36%, rgba(230,238,224,0.8), transparent 38%), url(${posterUrl})`,
              }}
            />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="h-6 w-6 translate-x-0.5" aria-hidden />
            </div>
          </div>
        ) : null}
        <div className="pointer-events-none absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-[#72f4a4]">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#72f4a4]" />
          LIVE SYNC
        </div>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white">
          {currentTrack ? formatDuration(currentTrack.duration) : '0:00'}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold tracking-[-0.02em] text-white">
            {currentTrack?.title ?? '재생 대기'}
          </h2>
          <p className="mt-1 truncate text-sm text-white/48">
            {currentTrack?.channelTitle ?? '곡을 추가해보세요'}
          </p>
        </div>
        {!isHost ? (
          <span className="hidden rounded-full border border-[#885cf6]/30 bg-[#885cf6]/10 px-3 py-1.5 text-xs font-semibold text-[#a78bfa] lg:block">
            호스트 제어
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
        <Button
          variant={isPlaying ? 'ghost' : 'primary'}
          size="md"
          className="min-w-28 rounded-2xl"
          disabled={controlDisabled}
          isLoading={pendingCommand === 'play' || pendingCommand === 'pause'}
          type="button"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause aria-hidden /> : <Play aria-hidden />}
          {isPlaying ? '일시정지' : '재생'}
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="rounded-2xl"
          disabled={controlDisabled || !nextItem}
          isLoading={pendingCommand === 'next'}
          type="button"
          onClick={handleNextTrack}
        >
          <SkipForward aria-hidden />
          다음 곡
        </Button>
        <Button
          variant="accent-soft"
          size="md"
          className="rounded-2xl"
          disabled={syncDisabled}
          type="button"
          onClick={handleSyncRequest}
        >
          <RefreshCcw aria-hidden />
          동기화
        </Button>
        <div className="ml-auto flex min-h-9 items-center gap-2 text-xs text-white/45">
          {pendingCommand ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          <Radio className="h-3.5 w-3.5 text-[#72f4a4]" aria-hidden />
          {isHost ? 'Host 제어 가능' : 'Host만 재생을 제어할 수 있어요.'}
        </div>
      </div>

      <div className="min-h-5 space-y-1 text-sm text-white/45">
        {syncStatus ? <p>{syncStatus}</p> : null}
        {commandError ? (
          <p className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {commandError}
          </p>
        ) : null}
        {playbackError ? (
          <p className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            재생할 수 없는 영상이에요. 오류 코드 {playbackError.errorCode}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function getThumbnailUrl(track: PlaylistItem) {
  if (track.thumbnailUrl) {
    return track.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
}

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
