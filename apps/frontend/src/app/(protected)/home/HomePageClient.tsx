'use client';

// Home 화면에서 사용자/최근 방 데이터를 조회해 HomeShell에 전달한다.
import { useMe } from '@/features/auth/hooks/useAuth';
import { HomeShell } from '@/features/home/HomeShell';
import { useRecentRooms } from '@/features/room/roomHooks';

// TODO: 방 만들기/코드 입장 dialog는 별도 작업으로 분리(stash)됨.
// 버튼은 유지하되 핸들러는 임시 no-op. dialog 복원 시 onCreate/onJoin 배선 다시 연결.
const noop = () => {};

export function HomePageClient() {
  const { data: user, isLoading: isUserLoading } = useMe();
  const recentRooms = useRecentRooms();

  return (
    <HomeShell
      nickname={user?.nickname ?? '게스트'}
      isUserLoading={isUserLoading}
      rooms={recentRooms.data?.rooms ?? []}
      isRoomsLoading={recentRooms.isLoading}
      onCreateRoom={noop}
      onJoinRoom={noop}
    />
  );
}
