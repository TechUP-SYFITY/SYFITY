'use client';

// Room 멤버 목록을 온라인과 오프라인 그룹으로 나누어 표시한다.
import type { RoomMember } from '@/shared/types/domain';

import { RoomIcon } from './RoomIcon';
import { RoomMemberAvatar } from './RoomMemberAvatar';

export function MemberList({
  compact = false,
  members,
}: {
  compact?: boolean;
  members: RoomMember[];
}) {
  const onlineMembers = members.filter((member) => member.status === 'online');
  const offlineMembers = members.filter((member) => member.status !== 'online');

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
  members: RoomMember[];
  title: string;
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-3 text-xs font-bold tracking-wide text-white/25 uppercase">{title}</p>
      <div className="space-y-1.5">
        {members.map((member) => (
          <div
            className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 ${
              member.role === 'host' && !isMuted ? 'bg-muted/20' : ''
            }`}
            key={member.userId}
          >
            <RoomMemberAvatar label={member.nickname} muted={isMuted} />
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-semibold ${
                  isMuted ? 'text-white/35' : 'text-white/90'
                }`}
              >
                {member.nickname}
                {member.role === 'host' ? (
                  <RoomIcon name="crown" className="ml-1 inline-block h-2.5 w-2.5 text-warning" />
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
