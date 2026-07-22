'use client';

import { UserCheck } from 'lucide-react';

import type { KickedRoomMember } from '@syfity/shared';

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

import { useUnkickRoomMember } from '../hooks/roomMemberHooks';

interface UnkickMemberDialogProps {
  member: KickedRoomMember | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  roomId: string;
}

export function UnkickMemberDialog({
  member,
  onOpenChange,
  open,
  roomId,
}: UnkickMemberDialogProps) {
  const unkickMember = useUnkickRoomMember(roomId);
  const { pushToast } = useToast();

  if (!member) {
    return null;
  }

  const setOpen = (nextOpen: boolean) => {
    if (unkickMember.isPending) {
      return;
    }

    if (!nextOpen) {
      unkickMember.reset();
    }
    onOpenChange(nextOpen);
  };

  const confirmUnkick = () => {
    if (unkickMember.isPending) {
      return;
    }

    unkickMember.mutate(member.id, {
      onSuccess: () => {
        pushToast({
          title: `${member.nickname}님의 추방을 해제했어요.`,
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
          if (unkickMember.isPending) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (unkickMember.isPending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3">
            <DialogIconBadge className="rounded-full border border-primary/30 bg-primary/15 bg-none from-transparent to-transparent text-primary shadow-[0_0_16px_rgba(114,244,164,0.25)] drop-shadow-none">
              <UserCheck aria-hidden />
            </DialogIconBadge>
            <DialogTitle className="truncate">{member.nickname}님의 추방을 해제할까요?</DialogTitle>
          </div>
          <DialogCloseButton disabled={unkickMember.isPending} />
        </DialogHeader>
        <DialogBody>
          <p
            className="mx-auto max-w-sm text-center text-sm leading-6 text-white/70"
            data-testid="unkick-member-notice"
          >
            추방을 해제해도 자동으로 입장되지는 않으며,
            <br />
            멤버가 다시 직접 입장해야 해요.
          </p>
          {unkickMember.isError ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {getApiErrorMessage(unkickMember.error)}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            className="sm:flex-1"
            disabled={unkickMember.isPending}
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button className="sm:flex-1" isLoading={unkickMember.isPending} onClick={confirmUnkick}>
            해제하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
