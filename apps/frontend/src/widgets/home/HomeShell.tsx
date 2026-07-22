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
  onCreateRoom: () => void;
  onJoinRoom: () => void;
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
  onCreateRoom,
  onJoinRoom,
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
        rooms={myRooms}
        isLoading={isMyRoomsLoading}
        isError={isMyRoomsError}
        onRetry={onRetryMyRooms}
      />
    </div>
  );
}
