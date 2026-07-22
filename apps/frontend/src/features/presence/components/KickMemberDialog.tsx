'use client';

import { UserMinus } from 'lucide-react';

import type { RoomMemberSummary } from '@syfity/shared';

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
  useToast,
} from '@/shared/components/ui';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';

import { useKickRoomMember } from '../hooks/roomMemberHooks';

interface KickMemberDialogProps {
  member: RoomMemberSummary | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  roomId: string;
}

export function KickMemberDialog({ member, onOpenChange, open, roomId }: KickMemberDialogProps) {
  const kickMember = useKickRoomMember(roomId);
  const { pushToast } = useToast();

  if (!member) {
    return null;
  }

  const setOpen = (nextOpen: boolean) => {
    if (kickMember.isPending) {
      return;
    }

    if (!nextOpen) {
      kickMember.reset();
    }
    onOpenChange(nextOpen);
  };

  const confirmKick = () => {
    if (kickMember.isPending) {
      return;
    }

    kickMember.mutate(member.id, {
      onSuccess: () => {
        pushToast({
          title: `${member.nickname}님을 추방했어요.`,
          variant: 'success',
        });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (kickMember.isPending) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (kickMember.isPending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3">
            <DialogIconBadge className="rounded-full border border-primary/30 bg-primary/15 bg-none from-transparent to-transparent text-primary shadow-[0_0_16px_rgba(114,244,164,0.25)] drop-shadow-none">
              <UserMinus aria-hidden />
            </DialogIconBadge>
            <DialogTitle className="truncate">{member.nickname}님을 추방할까요?</DialogTitle>
          </div>
          <DialogCloseButton disabled={kickMember.isPending} />
        </DialogHeader>
        <DialogBody>
          <p
            className="mx-auto max-w-sm text-center text-sm leading-6 text-white/70"
            data-testid="kick-member-notice"
          >
            추방된 멤버는 Host가 해제하기 전까지
            <br />이 Room에 다시 입장할 수 없어요.
          </p>
          {kickMember.isError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {getApiErrorMessage(kickMember.error)}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            className="sm:flex-1"
            disabled={kickMember.isPending}
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button
            className="sm:flex-1"
            isLoading={kickMember.isPending}
            variant="destructive"
            onClick={confirmKick}
          >
            추방하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
