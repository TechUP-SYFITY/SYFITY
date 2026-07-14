'use client';

import { AudioLines } from 'lucide-react';
import { useState } from 'react';

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

import { useCreateRoom } from '../hooks/roomHooks';
import type { CreateRoomResponse } from '../types/roomTypes';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (room: CreateRoomResponse) => void;
}

const MAX_NAME_LENGTH = 30;

export function CreateRoomDialog({ open, onOpenChange, onCreated }: CreateRoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <CreateRoomForm onOpenChange={onOpenChange} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  );
}

function CreateRoomForm({ onOpenChange, onCreated }: Omit<CreateRoomDialogProps, 'open'>) {
  const [name, setName] = useState('');
  const createRoom = useCreateRoom();

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
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <DialogIconBadge>
            <AudioLines className="inline-block shrink-0" aria-hidden />
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
            <AudioLines className="inline-block shrink-0" aria-hidden />
            만들기
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
