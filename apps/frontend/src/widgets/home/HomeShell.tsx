import type { RoomSummary } from '@/shared/types/domain';

import type { MyRoomSummary } from '@/features/room/types/roomTypes';

import { GreetingHeader } from './components/GreetingHeader';
import { MyRooms } from './components/MyRooms';
import { RecentRooms } from './components/RecentRooms';

interface HomeShellProps {
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
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onRecoverRoom: (roomId: string) => void;
  onRecoveryOpenChange?: (open: boolean) => void;
  onRetryMyRooms: () => void;
}

export function HomeShell({
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
        recoveringRoomId={recoveringRoomId}
        recoveryErrorMessage={recoveryErrorMessage}
        recoveryErrorRoomId={recoveryErrorRoomId}
        rooms={myRooms}
        isLoading={isMyRoomsLoading}
        isError={isMyRoomsError}
        onRecover={onRecoverRoom}
        onRecoveryOpenChange={onRecoveryOpenChange}
        onRetry={onRetryMyRooms}
      />
    </div>
  );
}
