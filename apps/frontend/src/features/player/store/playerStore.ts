'use client';

// Socket playback 이벤트로 갱신되는 현재 재생 상태를 보관한다.
import { create } from 'zustand';

import type {
  PlaybackEventSource,
  PlaybackSyncSource,
  PlaybackSyncStatus,
  PlayerPlaybackState,
} from '../types/playerTypes';

interface PlayerStoreState {
  beginPlaybackSync: (source?: PlaybackSyncSource) => void;
  clearPlaybackSync: () => void;
  clearPlayback: () => void;
  isLocalSyncPaused: boolean;
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
  playbackSyncSource: PlaybackSyncSource | null;
  pauseLocalSync: () => void;
  resumeLocalSync: () => void;
  setLocalPlaybackPosition: (videoId: string, currentTime: number) => void;
  setPlaybackError: (videoId: string, errorCode: number) => void;
  setPlaybackSyncError: () => void;
  setPlaybackState: (playbackState: PlayerPlaybackState, source: PlaybackEventSource) => void;
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  beginPlaybackSync: (source = 'auto') =>
    set({ playbackSyncSource: source, playbackSyncStatus: 'pending' }),
  clearPlayback: () =>
    set({
      isLocalSyncPaused: false,
      lastEventSource: null,
      localPlaybackPosition: null,
      playbackError: null,
      playbackState: null,
      playbackSyncStatus: 'idle',
      playbackSyncSource: null,
    }),
  clearPlaybackSync: () => set({ playbackSyncStatus: 'idle', playbackSyncSource: null }),
  isLocalSyncPaused: false,
  lastEventSource: null,
  localPlaybackPosition: null,
  playbackError: null,
  playbackState: null,
  playbackSyncStatus: 'idle',
  playbackSyncSource: null,
  pauseLocalSync: () => set({ isLocalSyncPaused: true }),
  resumeLocalSync: () => set({ isLocalSyncPaused: false }),
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
  setPlaybackSyncError: () => set({ playbackSyncStatus: 'error' }),
  setPlaybackState: (playbackState, source) =>
    set((state) => {
      let playbackSyncStatus = state.playbackSyncStatus;

      if (source === 'room-join') {
        playbackSyncStatus = 'idle';
      } else if (source === 'sync-response' && playbackSyncStatus === 'pending') {
        playbackSyncStatus = 'synced';
      }

      return {
        isLocalSyncPaused: source === 'room-join' ? false : state.isLocalSyncPaused,
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
