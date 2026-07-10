'use client';

import { Check, Copy, LogIn, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';

import type { CreateRoomResponse } from '../roomTypes';

interface InviteCodeDialogProps {
  room: CreateRoomResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useCopy() {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return { copied, copy };
}

export function InviteCodeDialog({ room, open, onOpenChange }: InviteCodeDialogProps) {
  const router = useRouter();
  const codeCopy = useCopy();
  const linkCopy = useCopy();

  if (!room) {
    return null;
  }

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/join?code=${room.inviteCode}`
      : `/room/join?code=${room.inviteCode}`;

  const handleEnter = () => {
    onOpenChange(false);
    router.push(`/room/${room.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-105">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogIconBadge>
              <Sparkles />
            </DialogIconBadge>
            <DialogTitle>방 생성 완료</DialogTitle>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-black drop-shadow-[0_0_16px_rgba(114,244,164,0.35)]">
              <Sparkles className="size-6" aria-hidden />
            </div>
            <p className="text-base font-bold text-white">방이 만들어졌어요!</p>
            <p className="text-sm text-white/50">{room.name}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-white/55">초대 코드</span>
            <div className="flex items-center gap-2">
              <div className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-bold tracking-[0.35em] text-primary">
                {room.inviteCode}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="초대 코드 복사"
                className="size-12 rounded-2xl"
                onClick={() => codeCopy.copy(room.inviteCode)}
              >
                {codeCopy.copied ? <Check className="text-primary" /> : <Copy />}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-white/55">초대 링크</span>
            <div className="flex items-center gap-2">
              <div className="flex h-11 flex-1 items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4">
                <span className="truncate text-xs text-white/50">{inviteLink}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="초대 링크 복사"
                className="size-11 rounded-2xl"
                onClick={() => linkCopy.copy(inviteLink)}
              >
                {linkCopy.copied ? <Check className="text-primary" /> : <Copy />}
              </Button>
            </div>
            <p className="mt-2 text-center text-sm text-white/30">
              친구에게 공유하고 방으로 입장하세요
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleEnter}
          >
            <LogIn />
            방으로 입장하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
