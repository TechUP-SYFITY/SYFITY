'use client';

import {
  Button,
  Dialog,
  DialogBody,
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">계정 삭제</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정을 삭제할까요?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>계정을 삭제하면 되돌릴 수 없어요.</DialogDescription>
        </DialogBody>
        <DialogFooter>
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
            삭제 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
