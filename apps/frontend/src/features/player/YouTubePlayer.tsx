'use client';

// YouTube IFrame Player API를 React 컴포넌트 생명주기에 연결한다.
import { useEffect, useRef } from 'react';

import { getPlaybackCorrection } from './playerSync';
import type { PlayerPlaybackState } from './playerTypes';
import { usePlayerVolumeStore } from './playerVolumeStore';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

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
  playbackState: PlayerPlaybackState | null;
  onBufferingRecovered: () => void;
  onEnded: () => void;
  onError: (errorCode: number) => void;
}

export function YouTubePlayer({
  playbackState,
  onBufferingRecovered,
  onEnded,
  onError,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const previousPlayerStateRef = useRef<number | null>(null);
  const isMuted = usePlayerVolumeStore((state) => state.isMuted);
  const volume = usePlayerVolumeStore((state) => state.volume);

  useEffect(() => {
    let isMounted = true;

    void loadYouTubeApi().then(() => {
      if (!isMounted || !containerRef.current || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        events: {
          onError: (event) => onError(Number(event.data)),
          onReady: (event) => {
            applyPlayerVolume(event.target, usePlayerVolumeStore.getState());
          },
          onStateChange: (event) => {
            const previousState = previousPlayerStateRef.current;
            previousPlayerStateRef.current = event.data;

            if (
              previousState === window.YT.PlayerState.BUFFERING &&
              event.data === window.YT.PlayerState.PLAYING
            ) {
              onBufferingRecovered();
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded();
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
      playerRef.current?.destroy();
      playerRef.current = null;
      loadedVideoIdRef.current = null;
    };
  }, [onBufferingRecovered, onEnded, onError]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    applyPlayerVolume(player, { isMuted, volume });
  }, [isMuted, volume]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !playbackState?.videoId) {
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
  }, [playbackState]);

  return (
    <div className="aspect-video w-full bg-black">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  );
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
