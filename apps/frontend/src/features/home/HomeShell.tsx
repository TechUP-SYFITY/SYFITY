import type { RoomSummary } from '@/shared/types/domain';

import { GreetingHeader } from './components/GreetingHeader';
import { RecentRooms } from './components/RecentRooms';

interface HomeShellProps {
  nickname: string;
  isUserLoading: boolean;
  rooms: RoomSummary[];
  isRoomsLoading: boolean;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function HomeShell({
  nickname,
  isUserLoading,
  rooms,
  isRoomsLoading,
  onCreateRoom,
  onJoinRoom,
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
        rooms={rooms}
        isLoading={isRoomsLoading}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
      />
    </div>
  );
}
