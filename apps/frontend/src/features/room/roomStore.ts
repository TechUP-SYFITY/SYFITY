'use client';

// Room 입장 후 실시간으로 공유되는 Room 상태를 보관한다.
import { create } from 'zustand';

import type { JoinedRoomData, RoomDetail, RoomMember } from '@/shared/types/domain';

interface RoomStoreState {
  room: RoomDetail | null;
  roomSocketError: string | null;
  members: RoomMember[];
  setJoinedRoom: (data: JoinedRoomData) => void;
  setMembers: (members: RoomMember[]) => void;
  setRoomSocketError: (message: string | null) => void;
  updateMember: (member: Omit<RoomMember, 'id'>) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  clearRoom: () => set({ members: [], room: null, roomSocketError: null }),
  members: [],
  room: null,
  roomSocketError: null,
  setJoinedRoom: (data) => set({ members: data.members, room: data.room }),
  setMembers: (members) => set({ members }),
  setRoomSocketError: (message) => set({ roomSocketError: message }),
  updateMember: (member) =>
    set((state) => ({
      members: state.members.map((currentMember) =>
        currentMember.userId === member.userId ? { ...currentMember, ...member } : currentMember,
      ),
    })),
}));
