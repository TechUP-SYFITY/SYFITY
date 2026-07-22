import type { RoomSummary } from '@/shared/types/domain';

import type { MyRoomSummary } from '@/features/room/types/roomTypes';

import { GreetingHeader } from './components/GreetingHeader';
import { MyRooms } from './components/MyRooms';
import { RecentRooms } from './components/RecentRooms';

interface HomeShellProps {
  deactivatingRoomId?: string;
  deactivationErrorMessage?: string;
  deactivationErrorRoomId?: string;
  nickname: string;
  isUserLoading: boolean;
  recentRooms: RoomSummary[];
  isRecentRoomsLoading: boolean;
  myRooms: MyRoomSummary[];
  isMyRoomsLoading: boolean;
  isMyRoomsError: boolean;
  recoveringRoomId?: string;
  recoveryErrorMessage?: string;
  recoveryErrorRoomId?: string;
  onDeactivateRoom: (roomId: string) => void;
  onDeactivationOpenChange?: (open: boolean) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onRecoverRoom: (roomId: string) => void;
  onRecoveryOpenChange?: (open: boolean) => void;
  onRetryMyRooms: () => void;
}

export function HomeShell({
  deactivatingRoomId,
  deactivationErrorMessage,
  deactivationErrorRoomId,
  nickname,
  isUserLoading,
  recentRooms,
  isRecentRoomsLoading,
  myRooms,
  isMyRoomsLoading,
  isMyRoomsError,
  recoveringRoomId,
  recoveryErrorMessage,
  recoveryErrorRoomId,
  onDeactivateRoom,
  onDeactivationOpenChange,
  onCreateRoom,
  onJoinRoom,
  onRecoverRoom,
  onRecoveryOpenChange,
  onRetryMyRooms,
}: HomeShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <GreetingHeader
        nickname={nickname}
        isLoading={isUserLoading}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
      />

      <RecentRooms
        rooms={recentRooms}
        isLoading={isRecentRoomsLoading}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
      />

      <MyRooms
        deactivatingRoomId={deactivatingRoomId}
        deactivationErrorMessage={deactivationErrorMessage}
        deactivationErrorRoomId={deactivationErrorRoomId}
        recoveringRoomId={recoveringRoomId}
        recoveryErrorMessage={recoveryErrorMessage}
        recoveryErrorRoomId={recoveryErrorRoomId}
        rooms={myRooms}
        isLoading={isMyRoomsLoading}
        isError={isMyRoomsError}
        onDeactivate={onDeactivateRoom}
        onDeactivationOpenChange={onDeactivationOpenChange}
        onRecover={onRecoverRoom}
        onRecoveryOpenChange={onRecoveryOpenChange}
        onRetry={onRetryMyRooms}
      />
    </div>
  );
}
