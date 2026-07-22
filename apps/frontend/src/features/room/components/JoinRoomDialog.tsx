'use client';

import { Headphones, Home, Loader2, Lock, LogIn, TimerOff, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { Input } from '@/shared/components/ui/Input';
import { ApiClientError } from '@/shared/types/api';

import type { RoomApi } from '../api/roomApi';
import { useJoinRoomByCode } from '../hooks/roomHooks';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
  roomApiClient?: RoomApi;
}

type RoomIssue = 'invalid' | 'closed' | 'inactive' | 'kicked';

const ROOM_ISSUE_BY_CODE: Record<string, RoomIssue> = {
  ROOM_NOT_FOUND: 'invalid',
  ROOM_ACCESS_DENIED: 'invalid',
  ROOM_CLOSED: 'closed',
  ROOM_INACTIVE: 'inactive',
  ROOM_MEMBER_KICKED: 'kicked',
};

const sanitizeInviteCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

export function JoinRoomDialog({
  open,
  onOpenChange,
  initialCode,
  roomApiClient,
}: JoinRoomDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="relative max-w-105">
        <JoinRoomForm
          onOpenChange={onOpenChange}
          initialCode={initialCode}
          roomApiClient={roomApiClient}
        />
      </DialogContent>
    </Dialog>
  );
}

function JoinRoomForm({
  onOpenChange,
  initialCode,
  roomApiClient,
}: Omit<JoinRoomDialogProps, 'open'>) {
  const router = useRouter();
  const prefilledCode = sanitizeInviteCode(initialCode ?? '');
  const [code, setCode] = useState(prefilledCode);
  const [submittedCode, setSubmittedCode] = useState(prefilledCode);
  const [isPrefilled, setIsPrefilled] = useState(() => prefilledCode.length > 0);
  const [hasInvalidChar, setHasInvalidChar] = useState(false);
  const joinRoom = useJoinRoomByCode(submittedCode, roomApiClient);

  useEffect(() => {
    if (joinRoom.data) {
      router.push(`/room/${joinRoom.data.room.id}`);
    }
  }, [joinRoom.data, router]);

  const trimmedCode = code.trim();
  const errorCode = joinRoom.error instanceof ApiClientError ? joinRoom.error.code : undefined;
  let roomIssue: RoomIssue | undefined;
  if (joinRoom.isError) {
    roomIssue = 'invalid';
    if (errorCode && ROOM_ISSUE_BY_CODE[errorCode]) {
      roomIssue = ROOM_ISSUE_BY_CODE[errorCode];
    }
  }
  const isLoading = joinRoom.fetchStatus === 'fetching' || joinRoom.isSuccess;
  const isBlocked = roomIssue === 'closed' || roomIssue === 'inactive' || roomIssue === 'kicked';

  let inputErrorMessage: string | undefined;
  if (roomIssue === 'invalid') {
    inputErrorMessage = '유효하지 않은 초대 코드예요. 다시 확인해주세요.';
  } else if (hasInvalidChar) {
    inputErrorMessage = '영문 대문자와 숫자만 입력할 수 있어요.';
  }

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPrefilled(false);
    const raw = event.target.value;
    const sanitized = sanitizeInviteCode(raw);
    setHasInvalidChar(sanitized !== raw.toUpperCase());
    setCode(sanitized);
  };

  const handleGoHome = () => {
    onOpenChange(false);
    router.push('/home');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (trimmedCode.length === 0 || isLoading) {
      return;
    }

    if (trimmedCode === submittedCode) {
      void joinRoom.refetch();
    } else {
      setSubmittedCode(trimmedCode);
    }
  };

  return (
    <>
      {!isLoading && <DialogCloseButton className="absolute top-4 right-4" />}

      <form onSubmit={handleSubmit}>
        <DialogBody className="items-center gap-5 pt-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <DialogIconBadge className="size-12 rounded-2xl">
              <Headphones className="size-5.5" />
            </DialogIconBadge>
            <div className="flex flex-col items-center gap-1">
              <DialogTitle className="text-lg">초대 코드로 입장</DialogTitle>
              <p className="max-w-65 text-sm text-white/48">
                초대 코드를 입력하거나
                <br />
                받은 초대 링크를 붙여넣으세요
              </p>
            </div>
          </div>

          <div className="h-px w-full bg-white/7" />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Loader2 className="size-5.5 animate-spin" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-base font-bold text-white">방에 입장하는 중...</p>
                <p className="text-sm text-white/48">잠시만 기다려주세요</p>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-1.5 text-left">
              <label htmlFor="join-room-code" className="text-xs font-semibold text-white/55">
                초대 코드
              </label>
              <Input
                id="join-room-code"
                value={code}
                onChange={handleCodeChange}
                placeholder="예: 3F9A2C"
                maxLength={6}
                showCount
                autoFocus={!isPrefilled}
                disabled={isBlocked}
                error={inputErrorMessage}
                className={
                  'text-center tracking-wide' +
                  (isPrefilled ? ' font-mono tracking-[0.2em] text-primary' : '')
                }
                size="lg"
              />
            </div>
          )}

          {roomIssue === 'closed' && (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-accent/25 bg-accent/10 px-5 py-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <Lock className="size-5" />
              </div>
              <p className="text-sm font-bold text-white">이미 종료된 방이에요</p>
              <p className="text-xs text-white/55">
                호스트가 방을 닫았어요. 다른 방을 찾아보거나 새 방을 만들어보세요.
              </p>
            </div>
          )}

          {roomIssue === 'inactive' && (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-5 py-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-warning/20 text-warning">
                <TimerOff className="size-5" />
              </div>
              <p className="text-sm font-bold text-white">입장할 수 없는 방이에요</p>
              <p className="text-xs text-white/55">
                오랫동안 활동이 없어 자동으로 비활성화 처리된 방이에요.
              </p>
            </div>
          )}

          {roomIssue === 'kicked' && (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-5 py-4 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
                <UserX className="size-5" />
              </div>
              <p className="text-sm font-bold text-white">이 Room에서 추방되었어요</p>
              <p className="text-xs text-white/55">Host가 다시 허용하기 전에는 입장할 수 없어요.</p>
            </div>
          )}
        </DialogBody>

        {!isLoading && (
          <DialogFooter>
            {isBlocked ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleGoHome}
              >
                <Home className="size-4" />
                홈으로 돌아가기
              </Button>
            ) : (
              <>
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
                  disabled={trimmedCode.length === 0}
                >
                  <LogIn className="size-4" />
                  {roomIssue === 'invalid' ? '다시 시도' : '입장하기'}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </form>
    </>
  );
}
