'use client';

import { UserRoundX } from 'lucide-react';
import type { ReactNode } from 'react';

import type { RoomMemberSummary } from '@syfity/shared';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui';

interface MemberActionMenuProps {
  children: ReactNode;
  disabled?: boolean;
  member: RoomMemberSummary;
  onRequestKick: (member: RoomMemberSummary) => void;
}

export function MemberActionMenu({
  children,
  disabled = false,
  member,
  onRequestKick,
}: MemberActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`${member.nickname} 멤버 관리`}
          className="w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={disabled}
          type="button"
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuLabel>{member.nickname}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRequestKick(member)}>
          <UserRoundX aria-hidden />
          추방
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
