// Room 상세 화면에서 Socket 연결 생명주기를 제공한다.
import type { PropsWithChildren } from 'react';

import { RoomSocketProvider } from '@/features/room/RoomSocketProvider';

export default function RoomLayout({ children }: PropsWithChildren) {
  return <RoomSocketProvider>{children}</RoomSocketProvider>;
}
