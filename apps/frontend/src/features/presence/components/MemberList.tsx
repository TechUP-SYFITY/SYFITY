'use client';

// Room 멤버 목록을 온라인과 오프라인 그룹으로 나누어 표시한다.
import { Crown } from 'lucide-react';

import { MemberAvatar } from './MemberAvatar';
import { usePresenceStore } from '../store/presenceStore';
import type { PresenceMember } from '../types/presence';

interface MemberListProps {
  compact?: boolean;
  members?: PresenceMember[];
}

export function MemberList({ compact = false, members }: MemberListProps) {
  const storeMembers = usePresenceStore((state) => state.members);
  const visibleMembers = (members ?? storeMembers).filter((member) => member.status !== 'left');
  const onlineMembers = visibleMembers.filter((member) => member.status === 'online');
  const offlineMembers = visibleMembers.filter((member) => member.status !== 'online');

  return (
    <div className={compact ? 'space-y-5 p-4' : 'space-y-5 p-5'}>
      <MemberGroup members={onlineMembers} title={`온라인 · ${onlineMembers.length}`} />
      <MemberGroup isMuted members={offlineMembers} title={`오프라인 · ${offlineMembers.length}`} />
    </div>
  );
}

function MemberGroup({
  isMuted = false,
  members,
  title,
}: {
  isMuted?: boolean;
  members: PresenceMember[];
  title: string;
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div>
      <p
        aria-live="polite"
        className="mb-3 text-xs font-bold tracking-wide text-white/25 uppercase"
      >
        {title}
      </p>
      <div className="space-y-1.5">
        {members.map((member) => (
          <div
            className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 ${
              member.role === 'host' && !isMuted ? 'bg-muted/20' : ''
            } `}
            key={member.userId}
          >
            <MemberAvatar
              label={member.nickname}
              muted={isMuted}
              profileImage={member.profileImage}
            />
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-semibold ${
                  isMuted ? 'text-white/35' : 'text-white/90'
                } `}
              >
                {member.nickname}
                {member.role === 'host' ? (
                  <Crown className="ml-1 inline-block size-2.5 shrink-0 text-warning" aria-hidden />
                ) : null}
              </p>
              <p className="text-xs text-white/35">{isMuted ? '오프라인' : '온라인'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
