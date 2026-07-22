'use client';

// Room 멤버의 이니셜 아바타와 온라인 상태 점을 표시한다.
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

interface MemberAvatarProps {
  label: string;
  muted?: boolean;
  profileImage?: string | null;
  showStatus?: boolean;
}

export function MemberAvatar({
  label,
  muted = false,
  profileImage,
  showStatus = true,
}: MemberAvatarProps) {
  return (
    <span className="relative inline-flex shrink-0 overflow-visible">
      <Avatar className={cn(muted && 'opacity-45')}>
        <AvatarImage alt={label} src={profileImage ?? undefined} />
        <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
      </Avatar>
      {showStatus ? (
        <span
          aria-hidden
          className={`absolute right-0 bottom-0 size-3 translate-0.5 rounded-full border-2 border-gray-950 ${
            muted ? 'bg-white/18' : 'bg-primary ring-2 ring-primary/30'
          } `}
        />
      ) : null}
    </span>
  );
}
