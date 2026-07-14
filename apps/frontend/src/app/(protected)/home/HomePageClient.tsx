'use client';

import { useState } from 'react';

import { useMe } from '@/features/auth/hooks/useAuth';
import { HomeShell } from '@/features/home/HomeShell';
import { CreateRoomDialog } from '@/features/room/components/CreateRoomDialog';
import { InviteCodeDialog } from '@/features/room/components/InviteCodeDialog';
import { JoinRoomDialog } from '@/features/room/components/JoinRoomDialog';
import { useRecentRooms } from '@/features/room/hooks/roomHooks';
import type { CreateRoomResponse, RoomInviteInfo } from '@/features/room/types/roomTypes';

export function HomePageClient() {
  const { data: user, isLoading: isUserLoading } = useMe();
  const recentRooms = useRecentRooms();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<RoomInviteInfo | null>(null);

  const handleCreateRoom = () => setIsCreateOpen(true);
  const handleJoinRoom = () => setIsJoinOpen(true);

  const handleRoomCreated = (room: CreateRoomResponse) => {
    setCreatedRoom(room);
    setIsInviteOpen(true);
  };

  return (
    <>
      <HomeShell
        nickname={user?.nickname ?? '게스트'}
        isUserLoading={isUserLoading}
        rooms={recentRooms.data?.rooms ?? []}
        isRoomsLoading={recentRooms.isLoading}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />

      <CreateRoomDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleRoomCreated}
      />

      <JoinRoomDialog open={isJoinOpen} onOpenChange={setIsJoinOpen} />

      <InviteCodeDialog
        room={createdRoom}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        showEnterButton
      />
    </>
  );
}
