'use client';

// Room 멤버의 이니셜 아바타와 온라인 상태 점을 표시한다.
import { Avatar as BaseAvatar, AvatarFallback } from '@/shared/components/ui';

export function Avatar({
  label,
  muted = false,
  size = 'md',
}: {
  label: string;
  muted?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs';

  return (
    <BaseAvatar className={`${sizeClass} ${muted ? 'opacity-45' : ''}`} size="sm">
      <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
      {size === 'md' ? (
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#09090b] ${
            muted ? 'bg-white/18' : 'bg-[#72f4a4] shadow-[0_0_6px_rgba(114,244,164,0.9)]'
          }`}
        />
      ) : null}
    </BaseAvatar>
  );
}
