'use client';

// Room 상단의 초대 액션 버튼을 표시한다.
import { Share2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';

export function RoomInviteButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="primary-soft"
      size="sm"
      className="h-9 w-9 rounded-full px-0 md:h-8 md:w-auto md:px-4"
      type="button"
      onClick={onClick}
    >
      <Share2 className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden md:inline">초대</span>
    </Button>
  );
}
