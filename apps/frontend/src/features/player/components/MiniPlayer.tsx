'use client';

// Room 하단에 고정되는 미니 플레이어 UI와 주입된 제어 상태를 표시한다.
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CSSProperties } from 'react';

import { formatDuration } from '@/shared/lib/formatDuration';
import { cn } from '@/shared/lib/utils';
import type { PlaybackPolicy, PlaybackState, PlaylistItem } from '@/shared/types/domain';

import { TrackArtwork } from './TrackArtwork';

export type MiniPlayerPendingCommand =
  'play' | 'pause' | 'previous' | 'next' | 'select' | 'seek' | 'repeat' | 'shuffle' | null;

interface MiniPlayerProps {
  commandError: string | null;
  controlDisabled: boolean;
  currentTrack: PlaylistItem | undefined;
  isHost: boolean;
  isLocalSyncPaused: boolean;
  isMuted: boolean;
  nextDisabled: boolean;
  onMuteToggle: () => void;
  onNextTrack: () => void;
  onPlayPause: () => void;
  onPreviousTrack: () => void;
  onRepeatToggle: () => void;
  onSeek: (seekTime: number) => void;
  onShuffleToggle: () => void;
  onVolumeChange: (volume: number) => void;
  pendingCommand: MiniPlayerPendingCommand;
  playbackState: PlaybackState | null;
  playPauseDisabled: boolean;
  previousDisabled: boolean;
  repeatMode: PlaybackPolicy['repeatMode'];
  shuffleEnabled: boolean;
  volume: number;
}

export function MiniPlayer({
  commandError,
  controlDisabled,
  currentTrack,
  isHost,
  isLocalSyncPaused,
  isMuted,
  nextDisabled,
  onMuteToggle,
  onNextTrack,
  onPlayPause,
  onPreviousTrack,
  onRepeatToggle,
  onSeek,
  onShuffleToggle,
  onVolumeChange,
  pendingCommand,
  playbackState,
  playPauseDisabled,
  previousDisabled,
  repeatMode,
  shuffleEnabled,
  volume,
}: MiniPlayerProps) {
  const duration = currentTrack?.duration ?? 0;
  const currentTime = getBoundedCurrentTime(playbackState?.currentTime ?? 0, duration);
  const isPlaying = !isHost && isLocalSyncPaused ? false : (playbackState?.isPlaying ?? false);
  const progressPercent = getProgressPercent(currentTime, duration);
  const playPauseLabel = isPlaying ? '일시정지' : '재생';
  const trackHint = getTrackControlHint({ controlDisabled, currentTrack, isHost });
  const playPauseHint = getPlayPauseControlHint({
    currentTrack,
    isHost,
    isPlaying,
    playPauseDisabled,
  });
  const previousControlDisabled = controlDisabled || previousDisabled;
  const nextControlDisabled = controlDisabled || nextDisabled;
  const seekDisabled = controlDisabled || duration <= 0;
  const isVolumeMuted = isMuted || volume === 0;
  const visibleVolume = isVolumeMuted ? 0 : volume;

  return (
    // 모바일 채팅/멤버/재생목록 오버레이(z-30)에 재생 컨트롤이 가려지지 않도록 그 위(z-40)에 둔다.
    // 오버레이의 pb-28(112px)이 이 MiniPlayer(h-16=64px) + 하단 탭 바(h-12=48px) 높이를
    // 정확히 합친 값이라 오버레이 콘텐츠와 겹치지 않는다.
    <footer className="fixed inset-x-0 bottom-0 z-40 flex h-16 shrink-0 items-center gap-4 border-t border-border bg-background/95 px-5 backdrop-blur-sm xl:static xl:h-room-mini-player xl:px-6">
      <div className="flex w-56 min-w-0 flex-none items-center gap-3">
        <TrackArtwork track={currentTrack} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {currentTrack?.title ?? '재생 대기'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {currentTrack?.channelTitle ?? '곡을 추가해보세요'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
        <div className="flex h-9 items-center justify-center gap-4">
          <button
            className={cn(
              getIconButtonClass(controlDisabled),
              shuffleEnabled && !controlDisabled && 'text-primary',
              `hidden md:flex`,
            )}
            type="button"
            aria-label={shuffleEnabled ? '셔플 끄기' : '셔플 켜기'}
            aria-pressed={shuffleEnabled}
            disabled={controlDisabled}
            onClick={onShuffleToggle}
          >
            <Shuffle className="inline-block size-3.5 shrink-0" aria-hidden />
          </button>
          <button
            className={getIconButtonClass(previousControlDisabled)}
            type="button"
            aria-label="이전 곡"
            aria-describedby="mini-player-track-hint"
            disabled={previousControlDisabled}
            onClick={onPreviousTrack}
          >
            <SkipBack className="inline-block size-4 shrink-0" aria-hidden />
          </button>
          <button
            className={cn(
              `flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none`,
              pendingCommand === 'play' || pendingCommand === 'pause' ? `animate-pulse` : '',
            )}
            type="button"
            aria-label={playPauseLabel}
            aria-describedby="mini-player-play-pause-hint"
            disabled={playPauseDisabled}
            onClick={onPlayPause}
          >
            {isPlaying ? (
              <Pause className="inline-block size-4 shrink-0" aria-hidden />
            ) : (
              <Play className="inline-block size-4 shrink-0" aria-hidden />
            )}
          </button>
          <button
            className={getIconButtonClass(nextControlDisabled)}
            type="button"
            aria-label="다음 곡"
            aria-describedby="mini-player-track-hint"
            disabled={nextControlDisabled}
            onClick={onNextTrack}
          >
            <SkipForward className="inline-block size-4 shrink-0" aria-hidden />
          </button>
          <button
            className={cn(
              getIconButtonClass(controlDisabled),
              repeatMode !== 'off' && !controlDisabled && 'text-primary',
              `hidden md:flex`,
            )}
            type="button"
            aria-label={getRepeatButtonLabel(repeatMode)}
            aria-pressed={repeatMode !== 'off'}
            disabled={controlDisabled}
            onClick={onRepeatToggle}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="inline-block size-3.5 shrink-0" aria-hidden />
            ) : (
              <Repeat className="inline-block size-3.5 shrink-0" aria-hidden />
            )}
          </button>
        </div>
        <div className="hidden w-full max-w-96 items-center gap-2 text-xs/4 text-muted-foreground xl:flex">
          <span>{formatDuration(currentTime)}</span>
          <div
            className="relative h-1 min-w-0 flex-1 rounded-full bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            role={isHost ? undefined : 'progressbar'}
            aria-label={isHost ? undefined : '재생 진행률'}
            aria-valuemin={isHost ? undefined : 0}
            aria-valuemax={isHost ? undefined : duration}
            aria-valuenow={isHost ? undefined : currentTime}
          >
            <div
              className="relative h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            >
              {progressPercent > 0 ? (
                <span
                  className="absolute top-1/2 right-0 size-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-lg"
                  data-testid="mini-player-progress-thumb"
                />
              ) : null}
            </div>
            {isHost ? (
              <input
                className="absolute top-1/2 left-0 h-5 w-full -translate-y-1/2 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                type="range"
                min={0}
                max={duration}
                step={1}
                aria-label="재생 위치 조절"
                disabled={seekDisabled}
                value={currentTime}
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
              />
            ) : null}
          </div>
          <span>{formatDuration(duration)}</span>
        </div>
        <p id="mini-player-track-hint" className="sr-only">
          {trackHint}
        </p>
        <p id="mini-player-play-pause-hint" className="sr-only">
          {playPauseHint}
        </p>
        {commandError ? (
          <p className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive shadow-lg">
            {commandError}
          </p>
        ) : null}
      </div>

      <div
        className="hidden w-36 flex-none mini-player-volume-control items-center justify-end gap-2 xl:flex"
        role="group"
        aria-label="볼륨"
      >
        <button
          className={getIconButtonClass(false)}
          type="button"
          aria-label={isVolumeMuted ? '음소거 해제' : '음소거'}
          onClick={onMuteToggle}
        >
          {isVolumeMuted ? (
            <VolumeX className="inline-block size-3.5 shrink-0" aria-hidden />
          ) : (
            <Volume2 className="inline-block size-3.5 shrink-0" aria-hidden />
          )}
        </button>
        <input
          className="mini-player-volume-range"
          type="range"
          min={0}
          max={100}
          step={1}
          aria-label="볼륨 조절"
          value={visibleVolume}
          style={
            {
              '--mini-player-volume-percent': `${visibleVolume}%`,
            } as CSSProperties
          }
          onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
        />
      </div>
    </footer>
  );
}

function getRepeatButtonLabel(repeatMode: PlaybackPolicy['repeatMode']) {
  if (repeatMode === 'all') return '전체 반복';
  if (repeatMode === 'one') return '한 곡 반복';
  return '반복 없음';
}

function getIconButtonClass(disabled: boolean) {
  return cn(
    'flex size-5 items-center justify-center text-sm transition',
    disabled
      ? 'cursor-not-allowed text-muted-foreground opacity-50'
      : `
        text-muted-foreground
        hover:text-foreground
      `,
  );
}

function getTrackControlHint({
  controlDisabled,
  currentTrack,
  isHost,
}: {
  controlDisabled: boolean;
  currentTrack: PlaylistItem | undefined;
  isHost: boolean;
}) {
  if (!isHost) {
    return 'Host만 곡 이동을 제어할 수 있어요';
  }

  if (!currentTrack) {
    return '재생 가능한 곡이 없어요';
  }

  if (controlDisabled) {
    return '재생 제어를 사용할 수 없어요';
  }

  return 'Host 제어 가능';
}

function getPlayPauseControlHint({
  currentTrack,
  isHost,
  isPlaying,
  playPauseDisabled,
}: {
  currentTrack: PlaylistItem | undefined;
  isHost: boolean;
  isPlaying: boolean;
  playPauseDisabled: boolean;
}) {
  if (!currentTrack) {
    return '재생 가능한 곡이 없어요';
  }

  if (!isHost) {
    if (playPauseDisabled) {
      return '재생 제어를 사용할 수 없어요';
    }

    return isPlaying ? '눌러서 일시정지' : '눌러서 재생';
  }

  if (playPauseDisabled) {
    return '재생 제어를 사용할 수 없어요';
  }

  return 'Host 제어 가능';
}

function getBoundedCurrentTime(currentTime: number, duration: number) {
  const flooredTime = Math.floor(currentTime);

  if (duration <= 0) {
    return Math.max(0, flooredTime);
  }

  return Math.min(Math.max(0, flooredTime), duration);
}

function getProgressPercent(currentTime: number, duration: number) {
  if (duration <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (currentTime / duration) * 100));
}
