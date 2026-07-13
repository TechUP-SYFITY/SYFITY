'use client';

// presence:update 소켓 이벤트로 갱신되는 참여자 목록을 보관한다.
import { create } from 'zustand';

import type { RoomMember } from '@/shared/types/domain';

export type PresenceMember = Omit<RoomMember, 'id'>;

interface PresenceStoreState {
  applyPresenceUpdate: (update: PresenceMember) => void;
  clearMembers: () => void;
  members: PresenceMember[];
  setMembers: (members: PresenceMember[]) => void;
}

export const usePresenceStore = create<PresenceStoreState>((set) => ({
  applyPresenceUpdate: (update) =>
    set((state) => {
      if (update.status === 'left') {
        return {
          members: state.members.filter((member) => member.userId !== update.userId),
        };
      }

      const existingIndex = state.members.findIndex((member) => member.userId === update.userId);

      if (existingIndex === -1) {
        return { members: [...state.members, update] };
      }

      return {
        members: state.members.map((member, index) =>
          index === existingIndex ? { ...member, ...update } : member,
        ),
      };
    }),
  clearMembers: () => set({ members: [] }),
  members: [],
  setMembers: (members) => set({ members }),
}));
