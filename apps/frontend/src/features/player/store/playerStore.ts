'use client';

// Socket playback 이벤트로 갱신되는 현재 재생 상태를 보관한다.
import { create } from 'zustand';

import type {
  PlaybackEventSource,
  PlaybackSyncStatus,
  PlayerPlaybackState,
} from '../types/playerTypes';

interface PlayerStoreState {
  beginPlaybackSync: () => void;
  clearPlaybackSync: () => void;
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
  playbackSyncStatus: PlaybackSyncStatus;
  setLocalPlaybackPosition: (videoId: string, currentTime: number) => void;
  setPlaybackError: (videoId: string, errorCode: number) => void;
  setPlaybackState: (playbackState: PlayerPlaybackState, source: PlaybackEventSource) => void;
  clearPlayback: () => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  beginPlaybackSync: () => set({ playbackSyncStatus: 'pending' }),
  clearPlayback: () =>
    set({
      lastEventSource: null,
      localPlaybackPosition: null,
      playbackError: null,
      playbackState: null,
      playbackSyncStatus: 'idle',
    }),
  clearPlaybackSync: () => set({ playbackSyncStatus: 'idle' }),
  lastEventSource: null,
  localPlaybackPosition: null,
  playbackError: null,
  playbackState: null,
  playbackSyncStatus: 'idle',
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
    set((state) => {
      let playbackSyncStatus = state.playbackSyncStatus;

      if (source === 'room-join') {
        playbackSyncStatus = 'idle';
      } else if (source === 'sync-response' && playbackSyncStatus === 'pending') {
        playbackSyncStatus = 'synced';
      }

      return {
        lastEventSource: source,
        localPlaybackPosition:
          source === 'tick' && state.localPlaybackPosition?.videoId === playbackState.videoId
            ? state.localPlaybackPosition
            : null,
        playbackError: null,
        playbackState,
        playbackSyncStatus,
      };
    }),
}));
