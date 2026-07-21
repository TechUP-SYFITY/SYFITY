'use client';

// Host Room 종료 확인과 Member 명시적 퇴장 액션을 역할별로 제공한다.
import { LogOut, OctagonX } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui';

type RoomExitRole = 'host' | 'member';

interface RoomExitActionProps {
  disabled?: boolean;
  errorMessage?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
  role: RoomExitRole;
}

export function RoomExitAction({
  disabled = false,
  errorMessage,
  isPending = false,
  onConfirm,
  onOpenChange,
  role,
}: RoomExitActionProps) {
  const [open, setOpen] = useState(false);

  if (role === 'member') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        disabled={disabled}
        onClick={onConfirm}
      >
        <LogOut aria-hidden />
        나가기
      </Button>
    );
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return;
    }

    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          disabled={disabled}
        >
          <OctagonX aria-hidden />
          Room 종료
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-105">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge className="bg-destructive/15 bg-none text-destructive">
              <OctagonX aria-hidden />
            </DialogIconBadge>
            <DialogTitle>Room을 종료할까요?</DialogTitle>
          </div>
          <DialogCloseButton disabled={isPending} />
        </DialogHeader>

        <DialogBody className="gap-3">
          <DialogDescription>
            모든 참여자가 Room에서 나가며 재생이 종료됩니다. 종료한 Room은 Home에서 다시 복구할 수
            있습니다.
          </DialogDescription>
          {errorMessage ? (
            <p role="alert" className="text-xs text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full sm:flex-1"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full sm:flex-1"
            aria-label="Room 종료 확인"
            isLoading={isPending}
            onClick={onConfirm}
          >
            <OctagonX aria-hidden />
            Room 종료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { RoomExitActionProps, RoomExitRole };
