'use client';

import { useMe } from '@/features/auth/hooks/useAuth';
import { useRecentRooms } from '@/features/room/roomHooks';

import { GreetingHeader } from './components/GreetingHeader';
import { RecentRooms } from './components/RecentRooms';
import { previewRecentRooms } from './homePreviewData';

const USE_PREVIEW_ROOMS = process.env.NODE_ENV === 'development' && !process.env.VITEST;

// ponytail: 방 만들기/코드 입장 dialog는 별도 작업으로 분리(stash)됨.
// 버튼은 유지하되 핸들러는 임시 no-op. dialog 복원 시 onCreate/onJoin 배선 다시 연결.
const noop = () => {};

export function HomeShell() {
  const { data: user, isLoading: isUserLoading } = useMe();
  const recentRooms = useRecentRooms();

  const apiRooms = recentRooms.data?.rooms ?? [];
  const rooms = USE_PREVIEW_ROOMS && apiRooms.length === 0 ? previewRecentRooms : apiRooms;

  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <GreetingHeader
        nickname={user?.nickname ?? '게스트'}
        isLoading={isUserLoading}
        onCreateRoom={noop}
        onJoinRoom={noop}
      />

      <RecentRooms
        rooms={rooms}
        isLoading={recentRooms.isLoading}
        onCreateRoom={noop}
        onJoinRoom={noop}
      />
    </div>
  );
}
