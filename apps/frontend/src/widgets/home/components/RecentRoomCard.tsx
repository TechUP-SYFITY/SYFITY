'use client';

import { AudioLines, ChevronRight, Clock, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { RoomSummary } from '@/shared/types/domain';

import { formatRelativeTime } from '../homeFormatters';

interface RecentRoomCardProps {
  room: RoomSummary;
}

export function RecentRoomCard({ room }: RecentRoomCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/room/${room.id}`)}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(17,17,19,0.72)] p-4 text-left transition-colors hover:border-primary/25 hover:bg-[rgba(23,23,26,0.85)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/25 to-accent/25 text-primary">
        <AudioLines className="size-5" aria-hidden />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-white">{room.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <Clock className="size-3" aria-hidden />
          {formatRelativeTime(room.lastJoinedAt)}
        </span>
      </span>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:hidden"
        aria-hidden
      >
        <LogIn className="size-3.5" />
      </span>

      <ChevronRight
        className="hidden size-5 shrink-0 text-white/25 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100 sm:block"
        aria-hidden
      />
    </button>
  );
}
