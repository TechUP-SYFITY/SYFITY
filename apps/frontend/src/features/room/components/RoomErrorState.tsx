import { CircleAlert, Home } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/components/ui';
import { ApiClientError } from '@/shared/types/api';

interface RoomErrorStateProps {
  error: unknown;
  roomId: string;
}

export function RoomErrorState({ error, roomId }: RoomErrorStateProps) {
  return (
    <main className="flex h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
          <CircleAlert className="h-5 w-5" aria-hidden />
        </div>
        <h1 className="mt-5 text-lg font-bold text-white">Room에 입장하지 못했어요</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">{getRoomErrorMessage(error)}</p>
        <p className="mt-3 max-w-full truncate text-xs text-white/30">Room ID: {roomId}</p>
        <Button asChild variant="ghost" className="mt-6 rounded-2xl">
          <Link href="/home">
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </Button>
      </div>
    </main>
  );
}

function getRoomErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === 'ROOM_NOT_FOUND') {
      return '존재하지 않거나 입장할 수 없는 Room입니다.';
    }

    if (error.code === 'ROOM_CLOSED') {
      return '이미 종료된 Room입니다.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.';
    }

    return error.message;
  }

  return '잠시 후 다시 시도해주세요.';
}
