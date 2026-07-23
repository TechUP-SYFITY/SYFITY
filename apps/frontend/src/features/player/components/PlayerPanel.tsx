'use client';

// Room의 YouTube 플레이어와 현재 재생 곡 정보를 표시한다.
import { AlertTriangle } from 'lucide-react';
import { useRef, type RefObject } from 'react';

import { YoutubeAttributionLink } from '@/shared/components/layout';
import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaybackSyncToast } from './PlaybackSyncToast';
import { YouTubePlayer } from './YouTubePlayer';
import { playbackCommands } from '../lib/playbackCommands';
import { usePlayerStore } from '../store/playerStore';
import type { PlayerController } from '../types/playerTypes';

interface PlayerPanelProps {
  canControlRoom: boolean;
  roomId: string;
  playerControllerRef?: RefObject<PlayerController | null>;
  onPlaybackStateChange: (isPlaying: boolean, currentTime: number) => void;
  playlist: PlaylistItem[];
}

export function PlayerPanel({
  canControlRoom,
  roomId,
  playerControllerRef,
  onPlaybackStateChange,
  playlist,
}: PlayerPanelProps) {
  const playerFrameRef = useRef<HTMLDivElement>(null);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playbackError = usePlayerStore((state) => state.playbackError);
  const beginPlaybackSync = usePlayerStore((state) => state.beginPlaybackSync);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const isLocalSyncPaused = usePlayerStore((state) => state.isLocalSyncPaused);
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  let statusText: string | null = null;
  if (isLocalSyncPaused) {
    statusText = '내 화면만 일시정지됨';
  } else if (!playbackState?.isPlaying) {
    statusText = '호스트가 일시정지함';
  }

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
    if (!canControlRoom || !playbackState?.videoId) {
      return;
    }

    void playbackCommands
      .reportError(roomId, playbackState.videoId, errorCode)
      .catch(() => undefined);
  }

  function handleTrackEnded() {
    if (!canControlRoom || !playbackState?.playlistItemId) return;
    void playbackCommands
      .reportEnded(roomId, playbackState.playlistItemId, playbackState.playbackVersion)
      .catch(() => undefined);
  }

  return (
    <section className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 xl:mx-0 xl:max-w-none xl:flex-col xl:items-stretch md:max-xl:portrait:max-w-[528px] max-xl:landscape:min-w-0 max-xl:landscape:flex-row max-xl:landscape:items-start">
      <div
        ref={playerFrameRef}
        className="relative flex min-h-[200px] min-w-[356px] flex-1 overflow-hidden rounded-2xl bg-background shadow-lg ring-1 ring-border xl:aspect-video xl:h-auto xl:w-full xl:min-w-0 xl:flex-none max-xl:landscape:h-[200px] max-xl:landscape:w-[356px] max-xl:landscape:flex-none"
      >
        <YouTubePlayer
          availableContainerRef={playerFrameRef}
          playerControllerRef={playerControllerRef}
          playbackState={playbackState}
          onBufferingRecovered={handleBufferingRecovered}
          onEnded={handleTrackEnded}
          onError={handlePlayerError}
          onPlaybackStateChange={onPlaybackStateChange}
        />
      </div>

      <div className="flex min-w-0 items-start justify-between gap-4 max-xl:landscape:flex-1 max-xl:landscape:items-center">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-foreground">
            {currentTrack?.title ?? '재생 대기'}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {currentTrack?.channelTitle ?? '곡을 추가해보세요'}
          </p>
          {statusText ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <YoutubeAttributionLink />
              <span className="break-keep">{statusText}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-5 space-y-1 text-sm text-muted-foreground">
        {playbackError ? (
          <p className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" aria-hidden />
            재생할 수 없는 영상이에요. 오류 코드 {playbackError.errorCode}
          </p>
        ) : null}
      </div>
      <PlaybackSyncToast />
    </section>
  );
}
