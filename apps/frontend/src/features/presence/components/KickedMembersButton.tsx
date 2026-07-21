'use client';

import { UserRoundX } from 'lucide-react';

import { Button } from '@/shared/components/ui';

import { useMemberManagement } from './MemberManagementProvider';

export function KickedMembersButton() {
  const { canManage, openKickedMembersDialog } = useMemberManagement();

  if (!canManage) {
    return null;
  }

  return (
    <Button
      aria-label="추방 관리"
      className="size-11 shrink-0 rounded-full"
      size="icon"
      title="추방 관리"
      variant="ghost"
      onClick={openKickedMembersDialog}
    >
      <UserRoundX aria-hidden />
    </Button>
  );
}
