'use client';

// Room 멤버의 이니셜 아바타와 온라인 상태 점을 표시한다.
import { Avatar, AvatarFallback } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

export function RoomMemberAvatar({
  label,
  muted = false,
  size = 'md',
}: {
  label: string;
  muted?: boolean;
  size?: 'sm' | 'md';
}) {
  const compactClassName = size === 'sm' ? 'size-6 text-[10px]' : undefined;

  return (
    <span className="relative inline-flex shrink-0 overflow-visible">
      <Avatar className={cn(compactClassName, muted && 'opacity-45')} size={size}>
        <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
      </Avatar>
      {size === 'md' ? (
        <span
          className={`absolute right-0 bottom-0 h-3 w-3 translate-x-0.5 translate-y-0.5 rounded-full border-2 border-gray-950 ${
            muted ? 'bg-white/18' : 'bg-primary-400 shadow-[0_0_6px_rgba(114,244,164,0.9)]'
          }`}
        />
      ) : null}
    </span>
  );
}
