'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Input } from '@/shared/components/ui/Input';

import { useCreateRoom } from '@/features/room/roomHooks';
import type { CreateRoomResponse } from '@/features/room/roomTypes';

import { RoomIcon } from './RoomIcon';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: CreateRoomResponse) => void;
}

const MAX_NAME_LENGTH = 30;

export function CreateRoomDialog({ open, onOpenChange, onCreated }: CreateRoomDialogProps) {
  const [name, setName] = useState('');
  const createRoom = useCreateRoom();

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName('');
      createRoom.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmedName = name.trim();
  const errorMessage = createRoom.isError ? '방 생성에 실패했어요. 다시 시도해 주세요.' : undefined;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (trimmedName.length === 0 || createRoom.isPending) {
      return;
    }

    createRoom.mutate(
      { name: trimmedName },
      {
        onSuccess: (room) => {
          onOpenChange(false);
          onCreated(room);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge>
              <RoomIcon name="brand" />
            </DialogIconBadge>
            <DialogTitle>방 만들기</DialogTitle>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <label
              htmlFor="create-room-name"
              className="flex items-center gap-1 text-xs font-semibold text-white/65"
            >
              방 이름 <span className="text-primary">*</span>
            </label>
            <Input
              id="create-room-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Chill Night"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              error={errorMessage}
              showCount
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full sm:flex-1"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full sm:flex-1"
              isLoading={createRoom.isPending}
              disabled={trimmedName.length === 0}
            >
              <RoomIcon name="brand" />
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
