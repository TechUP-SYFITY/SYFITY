// Home에서 사용자가 만든 Room 목록의 조회 상태를 표시하는 섹션.
import { HousePlus, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/Button';

import type { MyRoomSummary } from '@/features/room/types/roomTypes';

import { MyRoomCard } from './MyRoomCard';

interface MyRoomsProps {
  rooms: MyRoomSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function SectionHeading({ count }: { count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-base font-bold text-foreground">내 Room</h2>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export function MyRooms({ rooms, isLoading, isError, onRetry }: MyRoomsProps) {
  if (isLoading) {
    return (
      <section className="flex flex-col gap-3" aria-label="내 Room 불러오는 중">
        <SectionHeading />
        <div className="flex flex-col gap-3">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="flex min-h-20 animate-pulse items-center gap-4 rounded-lg border border-border bg-surface/70 p-4"
            >
              <div className="size-12 shrink-0 rounded-lg bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-4 w-2/5 rounded-sm bg-muted" />
                <div className="h-3 w-1/4 rounded-sm bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading />
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface/40 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-foreground">내 Room을 불러오지 못했어요</p>
          <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden />
            다시 시도
          </Button>
        </div>
      </section>
    );
  }

  if (rooms.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeading />
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface/40 px-6 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HousePlus className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">만든 Room이 없어요</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading count={rooms.length} />
      <div className="flex flex-col gap-3">
        {rooms.map((room) => (
          <MyRoomCard key={room.id} room={room} />
        ))}
      </div>
    </section>
  );
}
