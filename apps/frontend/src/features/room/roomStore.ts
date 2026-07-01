'use client';

// Room 입장 후 실시간으로 공유되는 Room 상태를 보관한다.
import { create } from 'zustand';

import type { JoinedRoomData, RoomDetail, RoomMember } from '@/shared/types/domain';

interface RoomStoreState {
  room: RoomDetail | null;
  members: RoomMember[];
  setJoinedRoom: (data: JoinedRoomData) => void;
  setMembers: (members: RoomMember[]) => void;
  updateMember: (member: Omit<RoomMember, 'id'>) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  clearRoom: () => set({ members: [], room: null }),
  members: [],
  room: null,
  setJoinedRoom: (data) => set({ members: data.members, room: data.room }),
  setMembers: (members) => set({ members }),
  updateMember: (member) =>
    set((state) => ({
      members: state.members.map((currentMember) =>
        currentMember.userId === member.userId ? { ...currentMember, ...member } : currentMember,
      ),
    })),
}));
