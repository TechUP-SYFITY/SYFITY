'use client';

// Socket playback 이벤트로 갱신되는 현재 재생 상태를 보관한다.
import { create } from 'zustand';

import type { PlaybackEventSource, PlayerPlaybackState } from './playerTypes';

interface PlayerStoreState {
  lastEventSource: PlaybackEventSource | null;
  localPlaybackPosition: {
    currentTime: number;
    videoId: string;
  } | null;
  playbackState: PlayerPlaybackState | null;
  playbackError: {
    videoId: string;
    errorCode: number;
  } | null;
  setLocalPlaybackPosition: (videoId: string, currentTime: number) => void;
  setPlaybackError: (videoId: string, errorCode: number) => void;
  setPlaybackState: (playbackState: PlayerPlaybackState, source: PlaybackEventSource) => void;
  clearPlayback: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  clearPlayback: () =>
    set({
      lastEventSource: null,
      localPlaybackPosition: null,
      playbackError: null,
      playbackState: null,
    }),
  lastEventSource: null,
  localPlaybackPosition: null,
  playbackError: null,
  playbackState: null,
  setLocalPlaybackPosition: (videoId, currentTime) =>
    set({
      localPlaybackPosition: {
        currentTime,
        videoId,
      },
    }),
  setPlaybackError: (videoId, errorCode) =>
    set({
      playbackError: {
        errorCode,
        videoId,
      },
    }),
  setPlaybackState: (playbackState, source) =>
    set((state) => ({
      lastEventSource: source,
      localPlaybackPosition:
        source === 'tick' && state.localPlaybackPosition?.videoId === playbackState.videoId
          ? state.localPlaybackPosition
          : null,
      playbackError: null,
      playbackState,
    })),
}));
