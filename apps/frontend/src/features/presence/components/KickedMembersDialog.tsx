'use client';

import { UserMinus } from 'lucide-react';

import type { KickedRoomMember } from '@syfity/shared';

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui';

import { MemberAvatar } from './MemberAvatar';
import { useKickedRoomMembers } from '../hooks/roomMemberHooks';

interface KickedMembersDialogProps {
  onOpenChange: (open: boolean) => void;
  onRequestUnkick: (member: KickedRoomMember) => void;
  open: boolean;
  roomId: string;
}

const kickedAtFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatKickedAt(kickedAt: string) {
  const date = new Date(kickedAt);

  return Number.isNaN(date.getTime()) ? null : kickedAtFormatter.format(date);
}

function KickedAt({ kickedAt }: { kickedAt: string }) {
  const formattedKickedAt = formatKickedAt(kickedAt);

  return formattedKickedAt ? (
    <time dateTime={kickedAt}>{formattedKickedAt}</time>
  ) : (
    <>추방 시간 알 수 없음</>
  );
}

export function KickedMembersDialog({
  onOpenChange,
  onRequestUnkick,
  open,
  roomId,
}: KickedMembersDialogProps) {
  const kickedMembers = useKickedRoomMembers(roomId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3">
            <DialogIconBadge className="rounded-full border border-primary/30 bg-primary/15 bg-none from-transparent to-transparent text-primary shadow-[0_0_16px_rgba(114,244,164,0.25)] drop-shadow-none">
              <UserMinus aria-hidden />
            </DialogIconBadge>
            <div className="min-w-0">
              <DialogTitle>추방 관리</DialogTitle>
              <DialogDescription>
                추방된 멤버를 확인하고 다시 입장할 수 있게 해제합니다.
              </DialogDescription>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>
        <DialogBody className="min-h-40">
          {kickedMembers.isPending ? (
            <div
              className="flex min-h-32 items-center justify-center text-sm text-white/45"
              role="status"
            >
              추방 목록을 불러오는 중이에요.
            </div>
          ) : null}

          {kickedMembers.isError ? (
            <div
              className="flex min-h-32 flex-col items-center justify-center gap-3 text-center"
              role="alert"
            >
              <p className="text-sm text-destructive">추방 목록을 불러오지 못했어요.</p>
              <Button size="sm" variant="ghost" onClick={() => void kickedMembers.refetch()}>
                다시 시도
              </Button>
            </div>
          ) : null}

          {kickedMembers.isSuccess && kickedMembers.data.members.length === 0 ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-white/45">
              추방된 멤버가 없어요.
            </div>
          ) : null}

          {kickedMembers.isSuccess && kickedMembers.data.members.length > 0 ? (
            <ul className="space-y-2" aria-label="추방된 멤버 목록">
              {kickedMembers.data.members.map((member) => (
                <li
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-white/3 px-3 py-2"
                  key={member.id}
                >
                  <MemberAvatar
                    label={member.nickname}
                    profileImage={member.profileImage}
                    showStatus={false}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/85">
                      {member.nickname}
                    </p>
                    <p className="text-xs text-white/35">
                      <KickedAt kickedAt={member.kickedAt} />
                    </p>
                  </div>
                  <Button
                    aria-label={`${member.nickname} 추방 해제`}
                    className="min-h-11 min-w-11"
                    size="sm"
                    variant="primary-soft"
                    onClick={() => onRequestUnkick(member)}
                  >
                    해제
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
