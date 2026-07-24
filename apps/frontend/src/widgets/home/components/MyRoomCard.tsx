'use client';

// Home의 내 Room 상태와 입장 동작을 표시하는 카드.
import { AudioLines, ChevronRight, Clock, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/shared/components/ui/Badge';

import { DeactivateRoomAction } from '@/features/room/components/DeactivateRoomAction';
import { RecoverRoomAction } from '@/features/room/components/RecoverRoomAction';
import type { MyRoomSummary } from '@/features/room/types/roomTypes';

import { formatRelativeTime } from '../homeFormatters';

interface MyRoomCardProps {
  deactivationErrorMessage?: string;
  isDeactivating: boolean;
  isRecovering: boolean;
  onDeactivate: (roomId: string) => void;
  onDeactivationOpenChange?: (open: boolean) => void;
  onRecover: (roomId: string) => void;
  onRecoveryOpenChange?: (open: boolean) => void;
  recoveryErrorMessage?: string;
  room: MyRoomSummary;
}

function getTimestampLabel(room: MyRoomSummary) {
  if (room.status === 'active') {
    return `${formatRelativeTime(room.updatedAt)} 업데이트`;
  }

  if (!room.closedAt) {
    return '종료 시각 없음';
  }

  return `${formatRelativeTime(room.closedAt)} 종료`;
}

function RoomDetails({ room }: { room: MyRoomSummary }) {
  const isActive = room.status === 'active';
  const timestampLabel = getTimestampLabel(room);

  return (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <AudioLines className="size-5" aria-hidden />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{room.name}</span>
          <Badge variant={isActive ? 'primary' : 'muted'} dot={isActive}>
            {isActive ? '활성' : '종료됨'}
          </Badge>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" aria-hidden />
          {timestampLabel}
        </span>
      </span>
    </>
  );
}

export function MyRoomCard({
  deactivationErrorMessage,
  isDeactivating,
  isRecovering,
  onDeactivate,
  onDeactivationOpenChange,
  onRecover,
  onRecoveryOpenChange,
  recoveryErrorMessage,
  room,
}: MyRoomCardProps) {
  const router = useRouter();

  if (room.status === 'closed') {
    return (
      <div className="flex min-h-20 flex-col gap-3 rounded-lg border border-border bg-surface/70 p-4 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex min-w-0 flex-1 items-center gap-4">
          <RoomDetails room={room} />
        </span>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <RecoverRoomAction
            errorMessage={recoveryErrorMessage}
            isPending={isRecovering}
            roomName={room.name}
            onConfirm={() => onRecover(room.id)}
            onOpenChange={onRecoveryOpenChange}
          />
          <DeactivateRoomAction
            errorMessage={deactivationErrorMessage}
            isPending={isDeactivating}
            roomName={room.name}
            onConfirm={() => onDeactivate(room.id)}
            onOpenChange={onDeactivationOpenChange}
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${room.name} 입장`}
      onClick={() => router.push(`/room/${room.id}`)}
      className="group flex min-h-20 w-full items-center gap-4 rounded-lg border border-border bg-surface/70 p-4 text-left transition-colors hover:border-primary/25 hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <RoomDetails room={room} />
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary sm:hidden"
        aria-hidden
      >
        <LogIn className="size-4" />
      </span>
      <ChevronRight
        className="hidden size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:block"
        aria-hidden
      />
    </button>
  );
}
