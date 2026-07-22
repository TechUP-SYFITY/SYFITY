'use client';

// closed Room 복구 전 초기화 범위를 확인하고 요청 상태를 표시한다.
import { RotateCcw } from 'lucide-react';
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

interface RecoverRoomActionProps {
  disabled?: boolean;
  errorMessage?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange?: (open: boolean) => void;
  roomName: string;
}

export function RecoverRoomAction({
  disabled = false,
  errorMessage,
  isPending = false,
  onConfirm,
  onOpenChange,
  roomName,
}: RecoverRoomActionProps) {
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
          variant="primary-soft"
          size="sm"
          aria-label={`${roomName} 복구`}
          disabled={disabled || isPending}
        >
          <RotateCcw aria-hidden />
          복구
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-105">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge>
              <RotateCcw aria-hidden />
            </DialogIconBadge>
            <DialogTitle>Room을 복구할까요?</DialogTitle>
          </div>
          <DialogCloseButton disabled={isPending} />
        </DialogHeader>

        <DialogBody className="gap-3">
          <DialogDescription>
            기존 Playlist와 재생 상태가 초기화됩니다. 참여 이력과 채팅은 유지됩니다.
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
            variant="primary"
            size="lg"
            className="w-full sm:flex-1"
            aria-label="Room 복구 확인"
            isLoading={isPending}
            onClick={onConfirm}
          >
            {!isPending ? <RotateCcw aria-hidden /> : null}
            Room 복구
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { RecoverRoomActionProps };
