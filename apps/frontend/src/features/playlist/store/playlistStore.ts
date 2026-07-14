'use client';

// Socket broadcast로 갱신되는 Playlist 목록을 보관한다.
import { create } from 'zustand';

import type { PlaylistItem } from '@/shared/types/domain';

interface PlaylistStoreState {
  playlist: PlaylistItem[];
  setPlaylist: (playlist: PlaylistItem[]) => void;
  clearPlaylist: () => void;
}

export const usePlaylistStore = create<PlaylistStoreState>((set) => ({
  clearPlaylist: () => set({ playlist: [] }),
  playlist: [],
  setPlaylist: (playlist) => set({ playlist }),
}));
