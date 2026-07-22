'use client';

// closed Room을 되돌릴 수 없는 inactive 상태로 전환하는 확인 UI를 제공한다.
import { Trash2 } from 'lucide-react';
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

interface DeactivateRoomActionProps {
  disabled?: boolean;
  errorMessage?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
  roomName: string;
}

export function DeactivateRoomAction({
  disabled = false,
  errorMessage,
  isPending = false,
  onConfirm,
  onOpenChange,
  roomName,
}: DeactivateRoomActionProps) {
  const [open, setOpen] = useState(false);

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
          aria-label={`${roomName} 비활성화`}
          disabled={disabled || isPending}
        >
          <Trash2 aria-hidden />
          비활성화
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-105">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge className="bg-destructive/15 bg-none text-destructive">
              <Trash2 aria-hidden />
            </DialogIconBadge>
            <DialogTitle>Room을 비활성화할까요?</DialogTitle>
          </div>
          <DialogCloseButton disabled={isPending} />
        </DialogHeader>

        <DialogBody className="gap-3">
          <DialogDescription>
            비활성화한 Room은 목록에서 삭제되며 다시 복구하거나 입장할 수 없습니다.
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
            aria-label="Room 비활성화 확인"
            isLoading={isPending}
            onClick={onConfirm}
          >
            {!isPending ? <Trash2 aria-hidden /> : null}
            Room 비활성화
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { DeactivateRoomActionProps };
