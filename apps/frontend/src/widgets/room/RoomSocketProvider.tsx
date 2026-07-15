'use client';

// Room 화면을 벗어날 때 Socket 연결을 정리한다.
import { useEffect, type PropsWithChildren } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

export function RoomSocketProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    return () => {
      socketClient.disconnect();
    };
  }, []);

  return <>{children}</>;
}
