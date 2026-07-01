// Room URL 파라미터를 Client 화면에 전달한다.
import { RoomPageClient } from './RoomPageClient';

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  return <RoomPageClient roomId={roomId} />;
}
