'use client';

// Room 입장 후 실시간으로 공유되는 Room 자체 상태(참여자 제외)를 보관한다.
import { create } from 'zustand';

import type { RoomClosedReason, RoomDetail } from '@/shared/types/domain';

import type { HostConnectionState } from './roomTypes';

interface RoomStoreState {
  hostConnection: HostConnectionState;
  room: RoomDetail | null;
  roomSocketError: string | null;
  markHostDisconnected: (waitUntil: string) => void;
  markHostReconnected: () => void;
  markRoomClosed: (reason: RoomClosedReason) => void;
  setJoinedRoom: (room: RoomDetail) => void;
  setRoomSocketError: (message: string | null) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  clearRoom: () =>
    set({
      hostConnection: { status: 'connected' },
      room: null,
      roomSocketError: null,
    }),
  hostConnection: { status: 'connected' },
  markHostDisconnected: (waitUntil) =>
    set({ hostConnection: { status: 'disconnected', waitUntil } }),
  markHostReconnected: () => set({ hostConnection: { status: 'connected' } }),
  markRoomClosed: (reason) =>
    set((state) => ({
      hostConnection: { reason, status: 'closed' },
      room: state.room ? { ...state.room, status: 'closed' } : null,
    })),
  room: null,
  roomSocketError: null,
  setJoinedRoom: (room) => set({ hostConnection: { status: 'connected' }, room }),
  setRoomSocketError: (message) => set({ roomSocketError: message }),
}));
