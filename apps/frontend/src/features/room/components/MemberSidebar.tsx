'use client';

// PC Room 레이아웃의 멤버 사이드바를 표시한다.
import { Badge } from '@/shared/components/ui';
import type { RoomMember } from '@/shared/types/domain';

import { MemberList } from './MemberList';

export function MemberSidebar({ members }: { members: RoomMember[] }) {
  const onlineCount = members.filter((member) => member.status === 'online').length;

  return (
    <aside className="flex min-h-0 flex-1 flex-col border-r border-border bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">멤버</span>
        <Badge variant="primary">{onlineCount}명</Badge>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MemberList members={members} compact />
      </div>
    </aside>
  );
}
