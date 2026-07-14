'use client';

// YouTube IFrame Player API를 React 컴포넌트 생명주기에 연결한다.
import { useEffect, useRef, type MutableRefObject } from 'react';

import { usePlayerStore } from './playerStore';
import { getPlaybackCorrection } from './playerSync';
import type { PlayerController, PlayerPlaybackState } from './playerTypes';
import { usePlayerVolumeStore } from './playerVolumeStore';

declare global {
  interface Window {
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
  playerControllerRef?: MutableRefObject<PlayerController | null>;
  playbackState: PlayerPlaybackState | null;
  onBufferingRecovered: () => void;
  onEnded: () => void;
  onError: (errorCode: number) => void;
  onPlaybackStateChange: (isPlaying: boolean, currentTime: number) => void;
}

export function YouTubePlayer({
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
  const previousPlayerStateRef = useRef<number | null>(null);
  const setLocalPlaybackPosition = usePlayerStore((state) => state.setLocalPlaybackPosition);
  const isMuted = usePlayerVolumeStore((state) => state.isMuted);
  const volume = usePlayerVolumeStore((state) => state.volume);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

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
            applyPlaybackState(event.target, playbackStateRef.current, loadedVideoIdRef);
          },
          onStateChange: (event) => {
            const previousState = previousPlayerStateRef.current;
            previousPlayerStateRef.current = event.data;
            const currentPlaybackState = playbackStateRef.current;

            if (
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
          modestbranding: 1,
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

    if (!player || !isPlayerReadyRef.current) {
      return;
    }

    applyPlaybackState(player, playbackState, loadedVideoIdRef);
  }, [playbackState]);

  useEffect(() => {
    const videoId = playbackState?.videoId;

    if (!videoId || !playbackState.isPlaying) {
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
  }, [playbackState?.isPlaying, playbackState?.videoId, setLocalPlaybackPosition]);

  return (
    <div className="aspect-video w-full bg-black">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  );
}

function applyPlaybackState(
  player: YT.Player,
  playbackState: PlayerPlaybackState | null,
  loadedVideoIdRef: MutableRefObject<string | null>,
) {
  if (!playbackState?.videoId) {
    return;
  }

  if (loadedVideoIdRef.current !== playbackState.videoId) {
    loadedVideoIdRef.current = playbackState.videoId;

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
