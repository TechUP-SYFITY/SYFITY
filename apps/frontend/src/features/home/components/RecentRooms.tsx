'use client';

import { Inbox, LogIn, Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';
import type { RoomSummary } from '@/shared/types/domain';

import { RecentRoomCard } from './RecentRoomCard';

interface RecentRoomsProps {
  rooms: RoomSummary[];
  isLoading: boolean;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

function SectionHeading({ count }: { count?: number }) {
  const showAll = typeof count === 'number' && count > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold text-white">최근 참여한 방</h2>
        {showAll && (
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs font-semibold text-white/50">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

export function RecentRooms({ rooms, isLoading, onCreateRoom, onJoinRoom }: RecentRoomsProps) {
  if (isLoading) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(17,17,19,0.72)] p-4"
            >
              <div className="size-13 shrink-0 rounded-2xl bg-white/8" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded bg-white/8" />
                <div className="h-3 w-1/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (rooms.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/5 text-white/40">
            <Inbox className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-white">아직 참여한 방이 없어요</p>
            <p className="text-xs text-white/45">새로 방을 만들어 함께 음악을 들어보세요</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="gradient" size="sm" onClick={onCreateRoom}>
              <Plus />방 만들기
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onJoinRoom}>
              <LogIn />
              코드 입장
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading count={rooms.length} />
      <div className="flex flex-col gap-3">
        {rooms.map((room) => (
          <RecentRoomCard key={room.id} room={room} />
        ))}
      </div>
    </section>
  );
}
