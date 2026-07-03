'use client';

// Socket playback 이벤트로 갱신되는 현재 재생 상태를 보관한다.
import { create } from 'zustand';

import type { PlaybackEventSource, PlayerPlaybackState } from './playerTypes';

interface PlayerStoreState {
  lastEventSource: PlaybackEventSource | null;
  playbackState: PlayerPlaybackState | null;
  playbackError: {
    videoId: string;
    errorCode: number;
  } | null;
  setPlaybackError: (videoId: string, errorCode: number) => void;
  setPlaybackState: (playbackState: PlayerPlaybackState, source: PlaybackEventSource) => void;
  clearPlayback: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  clearPlayback: () =>
    set({
      lastEventSource: null,
      playbackError: null,
      playbackState: null,
    }),
  lastEventSource: null,
  playbackError: null,
  playbackState: null,
  setPlaybackError: (videoId, errorCode) =>
    set({
      playbackError: {
        errorCode,
        videoId,
      },
    }),
  setPlaybackState: (playbackState, source) =>
    set({
      lastEventSource: source,
      playbackError: null,
      playbackState,
    }),
}));
