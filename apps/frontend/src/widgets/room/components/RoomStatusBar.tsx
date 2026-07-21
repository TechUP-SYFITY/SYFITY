'use client';

// Room 이름, 접속자 수, 초대 액션을 표시한다.
import type { ReactNode } from 'react';

import type { RoomDetail } from '@/shared/types/domain';

import { RoomInviteButton } from './RoomInviteButton';

export function RoomStatusBar({
  onInviteClick,
  onlineMemberCount,
  room,
  roomAction,
}: {
  onInviteClick?: () => void;
  onlineMemberCount: number;
  room: RoomDetail | null;
  roomAction?: ReactNode;
}) {
  return (
    <section className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background/50 px-5 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold">{room?.name ?? 'Room'}</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {onlineMemberCount}명 접속 중
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RoomInviteButton disabled={!room} onClick={onInviteClick} />
        {roomAction}
      </div>
    </section>
  );
}
