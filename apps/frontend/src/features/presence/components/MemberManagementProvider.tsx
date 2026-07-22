'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { KickedRoomMember, RoomMemberSummary } from '@syfity/shared';

import { KickedMembersDialog } from './KickedMembersDialog';
import { KickMemberDialog } from './KickMemberDialog';
import { UnkickMemberDialog } from './UnkickMemberDialog';
import { useActiveRoomMembers } from '../hooks/roomMemberHooks';

interface MemberManagementContextValue {
  activeMembers: RoomMemberSummary[];
  canManage: boolean;
  currentUserId?: string;
  isRosterError: boolean;
  isRosterPending: boolean;
  openKickDialog: (member: RoomMemberSummary) => void;
  openKickedMembersDialog: () => void;
  retryRoster: () => void;
}

interface MemberManagementProviderProps {
  children: ReactNode;
  currentUserId?: string;
  isHost: boolean;
  roomId: string;
}

const MemberManagementContext = createContext<MemberManagementContextValue | null>(null);

export function MemberManagementProvider({
  children,
  currentUserId,
  isHost,
  roomId,
}: MemberManagementProviderProps) {
  const activeMembers = useActiveRoomMembers(roomId, isHost);
  const [kickTarget, setKickTarget] = useState<RoomMemberSummary | null>(null);
  const [isKickOpen, setIsKickOpen] = useState(false);
  const [isKickedMembersOpen, setIsKickedMembersOpen] = useState(false);
  const [unkickTarget, setUnkickTarget] = useState<KickedRoomMember | null>(null);
  const [isUnkickOpen, setIsUnkickOpen] = useState(false);

  const openKickDialog = useCallback(
    (member: RoomMemberSummary) => {
      if (!isHost || member.role === 'host' || member.userId === currentUserId) {
        return;
      }

      setKickTarget(member);
      setIsKickOpen(true);
    },
    [currentUserId, isHost],
  );

  const handleKickOpenChange = useCallback((open: boolean) => {
    setIsKickOpen(open);
    if (!open) {
      setKickTarget(null);
    }
  }, []);

  const openKickedMembersDialog = useCallback(() => {
    if (!isHost) {
      return;
    }

    setIsKickedMembersOpen(true);
  }, [isHost]);

  const openUnkickDialog = useCallback(
    (member: KickedRoomMember) => {
      if (!isHost) {
        return;
      }

      setIsKickedMembersOpen(false);
      setUnkickTarget(member);
      setIsUnkickOpen(true);
    },
    [isHost],
  );

  const handleUnkickOpenChange = useCallback((open: boolean) => {
    setIsUnkickOpen(open);
    if (!open) {
      setUnkickTarget(null);
      setIsKickedMembersOpen(true);
    }
  }, []);

  const retryRoster = useCallback(() => {
    void activeMembers.refetch();
  }, [activeMembers]);

  const value = useMemo<MemberManagementContextValue>(
    () => ({
      activeMembers: activeMembers.data?.members ?? [],
      canManage: isHost,
      currentUserId,
      isRosterError: activeMembers.isError,
      isRosterPending: activeMembers.isPending && activeMembers.fetchStatus !== 'idle',
      openKickDialog,
      openKickedMembersDialog,
      retryRoster,
    }),
    [
      activeMembers.data?.members,
      activeMembers.fetchStatus,
      activeMembers.isError,
      activeMembers.isPending,
      currentUserId,
      isHost,
      openKickDialog,
      openKickedMembersDialog,
      retryRoster,
    ],
  );

  return (
    <MemberManagementContext.Provider value={value}>
      {children}
      <KickMemberDialog
        member={kickTarget}
        onOpenChange={handleKickOpenChange}
        open={isKickOpen}
        roomId={roomId}
      />
      <KickedMembersDialog
        onOpenChange={setIsKickedMembersOpen}
        onRequestUnkick={openUnkickDialog}
        open={isKickedMembersOpen}
        roomId={roomId}
      />
      <UnkickMemberDialog
        member={unkickTarget}
        onOpenChange={handleUnkickOpenChange}
        open={isUnkickOpen}
        roomId={roomId}
      />
    </MemberManagementContext.Provider>
  );
}

export function useMemberManagement() {
  const context = useContext(MemberManagementContext);

  if (!context) {
    throw new Error('useMemberManagement must be used within MemberManagementProvider.');
  }

  return context;
}
