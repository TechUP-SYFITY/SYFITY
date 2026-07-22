'use client';

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
      className="h-auto min-h-0 rounded-full px-2 py-0.5 text-xs"
      size="sm"
      title="추방 관리"
      variant="primary-soft"
      onClick={openKickedMembersDialog}
    >
      관리
    </Button>
  );
}
