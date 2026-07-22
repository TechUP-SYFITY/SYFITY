'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ErrorCode } from '@syfity/shared';

import { useToast } from '@/shared/components/ui/Toast';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import { ApiClientError } from '@/shared/types/api';

import { useMe } from '@/features/auth/hooks/useAuth';
import { CreateRoomDialog } from '@/features/room/components/CreateRoomDialog';
import { InviteCodeDialog } from '@/features/room/components/InviteCodeDialog';
import { JoinRoomDialog } from '@/features/room/components/JoinRoomDialog';
import { useMyRooms, useRecentRooms, useRecoverRoom } from '@/features/room/hooks/roomHooks';
import type { CreateRoomResponse, RoomInviteInfo } from '@/features/room/types/roomTypes';

import { HomeShell } from './HomeShell';

const RECOVERY_ERROR_MESSAGES = {
  ROOM_NOT_CLOSED: '이미 복구되었거나 복구할 수 없는 Room이에요.',
  ROOM_RECOVERY_EXPIRED: '더 이상 사용할 수 없는 Room이에요.',
} satisfies Partial<Record<ErrorCode, string>>;

export function HomePage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const { data: user, isLoading: isUserLoading } = useMe();
  const recentRooms = useRecentRooms();
  const myRooms = useMyRooms();
  const recoverRoom = useRecoverRoom();

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

  const handleRecoverRoom = (roomId: string) => {
    if (recoverRoom.isPending) {
      return;
    }

    recoverRoom.mutate(roomId, {
      onSuccess: () => {
        pushToast({ title: 'Room을 복구했어요.', variant: 'success' });
        router.push(`/room/${roomId}`);
      },
      onError: (error) => {
        if (error instanceof ApiClientError && error.code === 'ROOM_RECOVERY_EXPIRED') {
          pushToast({ title: RECOVERY_ERROR_MESSAGES.ROOM_RECOVERY_EXPIRED, variant: 'error' });
        }
      },
    });
  };

  const recoveryErrorMessage = recoverRoom.isError
    ? getApiErrorMessage(recoverRoom.error, { codeOverrides: RECOVERY_ERROR_MESSAGES })
    : undefined;

  return (
    <>
      <HomeShell
        nickname={user?.nickname ?? '게스트'}
        isUserLoading={isUserLoading}
        recentRooms={recentRooms.data?.rooms ?? []}
        isRecentRoomsLoading={recentRooms.isLoading}
        myRooms={myRooms.data?.rooms ?? []}
        isMyRoomsLoading={myRooms.isLoading}
        isMyRoomsError={myRooms.isError}
        recoveringRoomId={recoverRoom.isPending ? recoverRoom.variables : undefined}
        recoveryErrorMessage={recoveryErrorMessage}
        recoveryErrorRoomId={recoverRoom.isError ? recoverRoom.variables : undefined}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onRecoverRoom={handleRecoverRoom}
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
