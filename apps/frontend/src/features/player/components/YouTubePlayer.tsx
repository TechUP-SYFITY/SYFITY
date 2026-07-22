/// <reference types="youtube" />

'use client';

// YouTube IFrame Player API를 React 컴포넌트 생명주기에 연결한다.
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { getPlaybackCorrection } from '../lib/playerSync';
import { usePlayerStore } from '../store/playerStore';
import { usePlayerVolumeStore } from '../store/playerVolumeStore';
import type { PlayerController, PlayerPlaybackState } from '../types/playerTypes';

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;
const LOCAL_PLAYBACK_POLL_INTERVAL_MS = 250;

const loadYouTubeApi = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  youtubeApiPromise ??= new Promise<void>((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
};

interface YouTubePlayerProps {
  availableContainerRef?: RefObject<HTMLElement | null>;
  playerControllerRef?: RefObject<PlayerController | null>;
  playbackState: PlayerPlaybackState | null;
  onBufferingRecovered: () => void;
  onEnded: () => void;
  onError: (errorCode: number) => void;
  onPlaybackStateChange: (isPlaying: boolean, currentTime: number) => void;
}

export function YouTubePlayer({
  availableContainerRef,
  playerControllerRef,
  playbackState,
  onBufferingRecovered,
  onEnded,
  onError,
  onPlaybackStateChange,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isPlayerReadyRef = useRef(false);
  const loadedVideoIdRef = useRef<string | null>(null);
  const onBufferingRecoveredRef = useRef(onBufferingRecovered);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onPlaybackStateChangeRef = useRef(onPlaybackStateChange);
  const playbackStateRef = useRef(playbackState);
  const isLocalSyncPausedRef = useRef(false);
  const previousPlayerStateRef = useRef<number | null>(null);
  const suppressNextPausedSyncRef = useRef(false);
  const setLocalPlaybackPosition = usePlayerStore((state) => state.setLocalPlaybackPosition);
  const isLocalSyncPaused = usePlayerStore((state) => state.isLocalSyncPaused);
  const isMuted = usePlayerVolumeStore((state) => state.isMuted);
  const volume = usePlayerVolumeStore((state) => state.volume);
  const playerSize = usePlayerFrameSize(availableContainerRef);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    isLocalSyncPausedRef.current = isLocalSyncPaused;
  }, [isLocalSyncPaused]);

  useEffect(() => {
    onBufferingRecoveredRef.current = onBufferingRecovered;
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
    onPlaybackStateChangeRef.current = onPlaybackStateChange;
  }, [onBufferingRecovered, onEnded, onError, onPlaybackStateChange]);

  useEffect(() => {
    let isMounted = true;
    let controller: PlayerController | null = null;

    void loadYouTubeApi().then(() => {
      if (!isMounted || !containerRef.current || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        events: {
          onError: (event) => onErrorRef.current(Number(event.data)),
          onReady: (event) => {
            isPlayerReadyRef.current = true;
            controller = {
              pause: () => event.target.pauseVideo(),
              play: () => event.target.playVideo(),
            };
            if (playerControllerRef) {
              playerControllerRef.current = controller;
            }
            applyPlayerVolume(event.target, usePlayerVolumeStore.getState());
            if (!isLocalSyncPausedRef.current) {
              applyPlaybackState(
                event.target,
                playbackStateRef.current,
                loadedVideoIdRef,
                previousPlayerStateRef,
                suppressNextPausedSyncRef,
              );
            }
          },
          onStateChange: (event) => {
            const previousState = previousPlayerStateRef.current;
            previousPlayerStateRef.current = event.data;
            const currentPlaybackState = playbackStateRef.current;

            // loadVideoById로 재생 중이던 영상을 교체하면 브라우저가 src 전환 과정에서
            // 순간적으로 PAUSED 이벤트를 끼워 넣는 경우가 있다. 이를 실제 일시정지로
            // 오인해 서버에 pause 명령을 되돌려 보내지 않도록 로드 직후 1회만 무시한다.
            const isLoadArtifactPause =
              suppressNextPausedSyncRef.current && event.data === window.YT.PlayerState.PAUSED;
            suppressNextPausedSyncRef.current = false;

            if (
              !isLoadArtifactPause &&
              currentPlaybackState?.videoId &&
              (event.data === window.YT.PlayerState.PLAYING ||
                event.data === window.YT.PlayerState.PAUSED)
            ) {
              const isPlaying = event.data === window.YT.PlayerState.PLAYING;

              if (isPlaying !== currentPlaybackState.isPlaying) {
                const currentTime =
                  typeof event.target.getCurrentTime === 'function'
                    ? event.target.getCurrentTime()
                    : currentPlaybackState.currentTime;

                onPlaybackStateChangeRef.current(isPlaying, currentTime);
              }
            }

            if (
              previousState === window.YT.PlayerState.BUFFERING &&
              event.data === window.YT.PlayerState.PLAYING
            ) {
              onBufferingRecoveredRef.current();
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              onEndedRef.current();
            }
          },
        },
        height: '100%',
        playerVars: {
          controls: 0,
          playsinline: 1,
          rel: 0,
        },
        width: '100%',
      });
    });

    return () => {
      isMounted = false;
      isPlayerReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
      loadedVideoIdRef.current = null;
      previousPlayerStateRef.current = null;
      if (playerControllerRef?.current === controller) {
        playerControllerRef.current = null;
      }
    };
  }, [playerControllerRef]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    applyPlayerVolume(player, { isMuted, volume });
  }, [isMuted, volume]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !isPlayerReadyRef.current || isLocalSyncPaused) {
      return;
    }

    applyPlaybackState(
      player,
      playbackState,
      loadedVideoIdRef,
      previousPlayerStateRef,
      suppressNextPausedSyncRef,
    );
  }, [isLocalSyncPaused, playbackState]);

  useEffect(() => {
    const videoId = playbackState?.videoId;

    if (!videoId || !playbackState.isPlaying || isLocalSyncPaused) {
      return undefined;
    }

    const syncLocalPosition = () => {
      const player = playerRef.current;

      if (!player || !isPlayerReadyRef.current || typeof player.getCurrentTime !== 'function') {
        return;
      }

      setLocalPlaybackPosition(videoId, player.getCurrentTime());
    };

    syncLocalPosition();
    const intervalId = window.setInterval(syncLocalPosition, LOCAL_PLAYBACK_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isLocalSyncPaused,
    playbackState?.isPlaying,
    playbackState?.videoId,
    setLocalPlaybackPosition,
  ]);

  return (
    <div className="flex min-h-[200px] w-full items-center justify-center bg-black">
      <div
        className={playerSize ? 'shrink-0' : 'aspect-video h-auto w-full'}
        style={playerSize ? playerSizeToStyle(playerSize) : undefined}
      >
        <div className="size-full" ref={containerRef} />
      </div>
    </div>
  );
}

type PlayerFrameSize = { height: number; width: number };

export function calculatePlayerFrameSize(
  availableWidth: number,
  availableHeight: number,
): PlayerFrameSize {
  if (availableWidth <= 0 || availableHeight <= 0) {
    return { height: 200, width: 200 };
  }

  const widthLimitedHeight = availableWidth * (9 / 16);
  const height = Math.max(200, Math.min(availableHeight, widthLimitedHeight));
  const width = Math.min(availableWidth, height * (16 / 9));
  return { height: Math.round(height), width: Math.round(width) };
}

function playerSizeToStyle({ height, width }: PlayerFrameSize): CSSProperties {
  return { height, width };
}

function usePlayerFrameSize(
  availableContainerRef: RefObject<HTMLElement | null> | undefined,
): PlayerFrameSize | null {
  const [size, setSize] = useState<PlayerFrameSize | null>(null);

  useEffect(() => {
    const container = availableContainerRef?.current;
    if (!container) return undefined;

    const measure = () => {
      const { height, width } = container.getBoundingClientRect();
      setSize(calculatePlayerFrameSize(width, height));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [availableContainerRef]);

  return size;
}

function applyPlaybackState(
  player: YT.Player,
  playbackState: PlayerPlaybackState | null,
  loadedVideoIdRef: RefObject<string | null>,
  previousPlayerStateRef: RefObject<number | null>,
  suppressNextPausedSyncRef: RefObject<boolean>,
) {
  if (!playbackState?.videoId) {
    return;
  }

  if (loadedVideoIdRef.current !== playbackState.videoId) {
    loadedVideoIdRef.current = playbackState.videoId;
    // 재생 중이던 영상을 loadVideoById로 교체하면 src 전환 과정에서 브라우저가
    // 순간적으로 PAUSED 이벤트를 끼워 넣는 경우가 있다. 직전까지 실제로 재생 중이었을
    // 때만 이 artifact를 의심해, 다음 상태 이벤트가 PAUSED면 1회 무시한다.
    suppressNextPausedSyncRef.current =
      previousPlayerStateRef.current === window.YT.PlayerState.PLAYING;

    if (playbackState.isPlaying) {
      player.loadVideoById({
        startSeconds: playbackState.currentTime,
        videoId: playbackState.videoId,
      });
    } else {
      player.cueVideoById({
        startSeconds: playbackState.currentTime,
        videoId: playbackState.videoId,
      });
    }

    return;
  }

  const currentTime = player.getCurrentTime();
  const correction = getPlaybackCorrection(currentTime, playbackState);

  if (correction.shouldCorrect) {
    player.seekTo(correction.targetTime, true);
  }

  if (playbackState.isPlaying) {
    void player.playVideo();
    return;
  }

  player.pauseVideo();
}

function applyPlayerVolume(
  player: YT.Player,
  volumeState: Pick<ReturnType<typeof usePlayerVolumeStore.getState>, 'isMuted' | 'volume'>,
) {
  player.setVolume(volumeState.volume);

  if (volumeState.isMuted || volumeState.volume === 0) {
    player.mute();
    return;
  }

  player.unMute();
}
