'use client';

import { EllipsisVertical, UserRoundX } from 'lucide-react';

import type { RoomMemberSummary } from '@syfity/shared';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';

interface MemberActionMenuProps {
  disabled?: boolean;
  member: RoomMemberSummary;
  onRequestKick: (member: RoomMemberSummary) => void;
}

export function MemberActionMenu({
  disabled = false,
  member,
  onRequestKick,
}: MemberActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${member.nickname} 멤버 관리`}
          className="size-9 shrink-0 rounded-xl border-0 bg-transparent text-white/45 transition-colors hover:bg-white/10 hover:text-white/85 focus-visible:bg-white/10 focus-visible:text-white/85"
          disabled={disabled}
          size="icon"
          variant="ghost"
        >
          <EllipsisVertical aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{member.nickname}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRequestKick(member)}>
          <UserRoundX aria-hidden />
          멤버 추방
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
