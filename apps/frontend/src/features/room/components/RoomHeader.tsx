'use client';

// Room 화면의 브랜드 영역과 현재 사용자 메뉴를 표시한다.
import { Avatar, AvatarFallback, Button } from '@/shared/components/ui';

import { RoomIcon } from './RoomIcon';

export function RoomHeader({ currentUserName }: { currentUserName: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-gray-950/50 px-5 md:px-6">
      <div className="flex items-center gap-2">
        <RoomIcon
          name="brand"
          className="h-8 w-8 text-primary-400 drop-shadow-[0_0_14px_rgba(114,244,164,0.35)]"
        />
        <span className="text-base font-bold tracking-[-0.02em]">Syfity</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-2xl border-0 bg-transparent p-1 text-sm hover:bg-white/5"
        type="button"
      >
        <Avatar size="sm" className="size-8">
          <AvatarFallback>{currentUserName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="hidden font-semibold md:inline">{currentUserName}</span>
        <RoomIcon name="chevronDown" className="h-3.5 w-3.5 text-white/45" />
      </Button>
    </header>
  );
}
