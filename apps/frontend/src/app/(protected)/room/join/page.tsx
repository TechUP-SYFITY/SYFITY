// Room 초대 링크 진입점에서 초대 코드 입장 Client 화면을 렌더링한다.
import { RoomJoinPageClient } from '@/features/room/RoomJoinPageClient';

interface RoomJoinPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function RoomJoinPage({ searchParams }: RoomJoinPageProps) {
  const { code } = await searchParams;

  return <RoomJoinPageClient initialCode={code} />;
}
