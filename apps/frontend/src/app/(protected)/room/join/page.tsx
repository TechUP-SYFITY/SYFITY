import { JoinRoomClient } from './JoinRoomClient';

interface RoomJoinPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function RoomJoinPage({ searchParams }: RoomJoinPageProps) {
  const { code } = await searchParams;

  return <JoinRoomClient initialCode={code} />;
}
