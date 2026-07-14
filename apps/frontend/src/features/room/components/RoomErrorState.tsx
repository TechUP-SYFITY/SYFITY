import { CircleAlert, Home } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/components/ui';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';

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
        <p className="mt-2 text-sm leading-6 text-white/50">{getApiErrorMessage(error)}</p>
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
