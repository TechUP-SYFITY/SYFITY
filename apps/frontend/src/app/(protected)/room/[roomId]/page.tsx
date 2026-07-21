// Room URL 파라미터를 Client 화면에 전달한다.
import { RoomPage as RoomPageWidget } from '@/widgets/room/RoomPage';

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function RoomPageRoute({ params }: RoomPageProps) {
  const { roomId } = await params;

  return <RoomPageWidget roomId={roomId} />;
}
