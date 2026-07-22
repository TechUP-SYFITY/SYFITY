'use client';

// Room 멤버 목록을 온라인과 오프라인 그룹으로 나누어 표시한다.
import { Crown, EllipsisVertical } from 'lucide-react';

import type { RoomMemberSummary } from '@syfity/shared';

import { Button } from '@/shared/components/ui';

import { MemberActionMenu } from './MemberActionMenu';
import { MemberAvatar } from './MemberAvatar';
import { useMemberManagement } from './MemberManagementProvider';
import { usePresenceStore } from '../store/presenceStore';
import type { PresenceMember } from '../types/presence';

interface MemberListProps {
  compact?: boolean;
  members?: PresenceMember[];
}

export function MemberList({ compact = false, members }: MemberListProps) {
  const storeMembers = usePresenceStore((state) => state.members);
  const {
    activeMembers,
    canManage,
    currentUserId,
    isRosterError,
    isRosterPending,
    openKickDialog,
    retryRoster,
  } = useMemberManagement();
  const visibleMembers = (members ?? storeMembers).filter((member) => member.status !== 'left');
  const onlineMembers = visibleMembers.filter((member) => member.status === 'online');
  const offlineMembers = visibleMembers.filter((member) => member.status !== 'online');
  const activeMemberByUserId = new Map(activeMembers.map((member) => [member.userId, member]));

  return (
    <div className={compact ? 'space-y-5 p-4' : 'space-y-5 p-5'}>
      {canManage && isRosterError ? (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2"
          role="alert"
        >
          <span className="text-xs text-destructive">멤버 관리 정보를 불러오지 못했어요.</span>
          <Button size="sm" variant="ghost" onClick={retryRoster}>
            다시 시도
          </Button>
        </div>
      ) : null}
      <MemberGroup
        activeMemberByUserId={activeMemberByUserId}
        canManage={canManage}
        currentUserId={currentUserId}
        isRosterPending={isRosterPending}
        members={onlineMembers}
        onRequestKick={openKickDialog}
        title={`온라인 · ${onlineMembers.length}`}
      />
      <MemberGroup
        activeMemberByUserId={activeMemberByUserId}
        canManage={canManage}
        currentUserId={currentUserId}
        isMuted
        isRosterPending={isRosterPending}
        members={offlineMembers}
        onRequestKick={openKickDialog}
        title={`오프라인 · ${offlineMembers.length}`}
      />
    </div>
  );
}

function MemberGroup({
  activeMemberByUserId,
  canManage,
  currentUserId,
  isMuted = false,
  isRosterPending,
  members,
  onRequestKick,
  title,
}: {
  activeMemberByUserId: Map<string, RoomMemberSummary>;
  canManage: boolean;
  currentUserId?: string;
  isMuted?: boolean;
  isRosterPending: boolean;
  members: PresenceMember[];
  onRequestKick: (member: RoomMemberSummary) => void;
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
        {members.map((member) => {
          const managementMember = activeMemberByUserId.get(member.userId);
          const isEligibleTarget =
            canManage && member.role !== 'host' && member.userId !== currentUserId;
          const row = <MemberRow isMuted={isMuted} member={member} />;

          if (!isEligibleTarget) {
            return <MemberRow isMuted={isMuted} key={member.userId} member={member} />;
          }

          if (!managementMember) {
            return (
              <div className="flex items-center gap-1" key={member.userId}>
                <div className="min-w-0 flex-1">{row}</div>
                <Button
                  aria-label={
                    isRosterPending
                      ? '멤버 관리 정보를 불러오는 중이에요'
                      : '멤버 관리 정보를 불러오지 못했어요'
                  }
                  className="size-11 shrink-0 rounded-xl"
                  disabled
                  size="icon"
                  variant="ghost"
                >
                  <EllipsisVertical aria-hidden />
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1" key={member.userId}>
              <div className="min-w-0 flex-1">{row}</div>
              <MemberActionMenu
                disabled={isRosterPending}
                member={managementMember}
                onRequestKick={onRequestKick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ isMuted, member }: { isMuted: boolean; member: PresenceMember }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-2 py-1.5 ${
        member.role === 'host' && !isMuted ? 'bg-muted/20' : ''
      } `}
    >
      <MemberAvatar label={member.nickname} muted={isMuted} profileImage={member.profileImage} />
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
  );
}
