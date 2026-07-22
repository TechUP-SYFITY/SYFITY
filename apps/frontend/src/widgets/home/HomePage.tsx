'use client';

import { useState } from 'react';

import { useMe } from '@/features/auth/hooks/useAuth';
import { CreateRoomDialog } from '@/features/room/components/CreateRoomDialog';
import { InviteCodeDialog } from '@/features/room/components/InviteCodeDialog';
import { JoinRoomDialog } from '@/features/room/components/JoinRoomDialog';
import { useMyRooms, useRecentRooms } from '@/features/room/hooks/roomHooks';
import { useDeactivateRoomAction } from '@/features/room/hooks/useDeactivateRoomAction';
import { useRecoverRoomAction } from '@/features/room/hooks/useRecoverRoomAction';
import type { CreateRoomResponse, RoomInviteInfo } from '@/features/room/types/roomTypes';

import { HomeShell } from './HomeShell';

export function HomePage() {
  const { data: user, isLoading: isUserLoading } = useMe();
  const recentRooms = useRecentRooms();
  const myRooms = useMyRooms();
  const deactivateRoom = useDeactivateRoomAction();
  const recoverRoom = useRecoverRoomAction();

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
        deactivatingRoomId={deactivateRoom.deactivatingRoomId}
        deactivationErrorMessage={deactivateRoom.errorMessage}
        deactivationErrorRoomId={deactivateRoom.errorRoomId}
        nickname={user?.nickname ?? '게스트'}
        isUserLoading={isUserLoading}
        recentRooms={recentRooms.data?.rooms ?? []}
        isRecentRoomsLoading={recentRooms.isLoading}
        myRooms={myRooms.data?.rooms ?? []}
        isMyRoomsLoading={myRooms.isLoading}
        isMyRoomsError={myRooms.isError}
        recoveringRoomId={recoverRoom.recoveringRoomId}
        recoveryErrorMessage={recoverRoom.errorMessage}
        recoveryErrorRoomId={recoverRoom.errorRoomId}
        onDeactivateRoom={deactivateRoom.deactivate}
        onDeactivationOpenChange={(open) => {
          if (!open) {
            deactivateRoom.reset();
          }
        }}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onRecoverRoom={recoverRoom.recover}
        onRecoveryOpenChange={(open) => {
          if (!open) {
            recoverRoom.reset();
          }
        }}
        onRetryMyRooms={() => void myRooms.refetch()}
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
