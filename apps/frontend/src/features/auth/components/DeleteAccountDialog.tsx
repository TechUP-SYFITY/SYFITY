'use client';

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
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui';

import { useDeleteAccount } from '../hooks/useAuth';

export function DeleteAccountDialog() {
  const deletion = useDeleteAccount();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (deletion.isPending && !nextOpen) return;
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive">회원 탈퇴</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원 탈퇴할까요?</DialogTitle>
          <DialogCloseButton disabled={deletion.isPending} />
        </DialogHeader>
        <DialogBody>
          <DialogDescription>탈퇴하면 되돌릴 수 없어요.</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={deletion.isPending}
            onClick={() => handleOpenChange(false)}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            isLoading={deletion.isPending}
            onClick={() =>
              deletion.mutate(undefined, {
                onSuccess: () => {
                  window.location.href = '/';
                },
              })
            }
          >
            탈퇴 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
