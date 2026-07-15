'use client';

// Player의 개인 로컬 볼륨 상태를 서버 playback 상태와 분리해 관리한다.
import { create } from 'zustand';

const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

interface PlayerVolumeStoreState {
  isMuted: boolean;
  previousVolume: number;
  volume: number;
  setVolume: (volume: number) => void;
  toggleMuted: () => void;
}

export const usePlayerVolumeStore = create<PlayerVolumeStoreState>((set) => ({
  isMuted: false,
  previousVolume: DEFAULT_VOLUME,
  setVolume: (volume) => {
    const nextVolume = normalizeVolume(volume);

    set((state) => ({
      isMuted: nextVolume === 0,
      previousVolume: nextVolume > 0 ? nextVolume : state.previousVolume,
      volume: nextVolume,
    }));
  },
  toggleMuted: () =>
    set((state) => {
      if (state.isMuted || state.volume === 0) {
        const restoredVolume = state.volume > 0 ? state.volume : state.previousVolume;

        return {
          isMuted: false,
          volume: restoredVolume,
        };
      }

      return {
        isMuted: true,
      };
    }),
  volume: DEFAULT_VOLUME,
}));

function normalizeVolume(volume: number) {
  if (!Number.isFinite(volume)) {
    return DEFAULT_VOLUME;
  }

  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(volume)));
}
