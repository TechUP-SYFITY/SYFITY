'use client';

// Room 입장 후 실시간으로 공유되는 Room 상태를 보관한다.
import { create } from 'zustand';

import type {
  JoinedRoomData,
  RoomClosedReason,
  RoomDetail,
  RoomMember,
} from '@/shared/types/domain';

import type { HostConnectionState } from './roomTypes';

interface RoomStoreState {
  hostConnection: HostConnectionState;
  room: RoomDetail | null;
  roomSocketError: string | null;
  members: RoomMember[];
  markHostDisconnected: (waitUntil: string) => void;
  markHostReconnected: () => void;
  markRoomClosed: (reason: RoomClosedReason) => void;
  setJoinedRoom: (data: JoinedRoomData) => void;
  setMembers: (members: RoomMember[]) => void;
  setRoomSocketError: (message: string | null) => void;
  updateMember: (member: Omit<RoomMember, 'id'>) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  clearRoom: () =>
    set({
      hostConnection: { status: 'connected' },
      members: [],
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
  members: [],
  room: null,
  roomSocketError: null,
  setJoinedRoom: (data) =>
    set({ hostConnection: { status: 'connected' }, members: data.members, room: data.room }),
  setMembers: (members) => set({ members }),
  setRoomSocketError: (message) => set({ roomSocketError: message }),
  updateMember: (member) =>
    set((state) => ({
      members: state.members.map((currentMember) =>
        currentMember.userId === member.userId ? { ...currentMember, ...member } : currentMember,
      ),
    })),
}));
