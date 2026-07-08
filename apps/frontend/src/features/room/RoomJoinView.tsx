'use client';

// Room 초대 코드 입력과 입장 상태별 화면을 표시한다.
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  DoorClosed,
  Headphones,
  Home,
  Loader2,
  LogIn,
} from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

import { RoomIcon } from './components/RoomIcon';

type RoomJoinState = 'default' | 'loading' | 'invalid-code' | 'closed' | 'inactive';

interface RoomJoinViewProps {
  code: string;
  state?: RoomJoinState;
  onCancel: () => void;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
}

const ROOM_JOIN_MAX_LENGTH = 6;

const roomJoinErrorContent = {
  closed: {
    icon: DoorClosed,
    title: '이미 종료된 방이에요',
    description: '호스트가 방을 닫았어요. 다른 방을 찾아보거나 새 방을 만들어보세요.',
    toneClass: 'room-entry-status-accent text-accent-400',
  },
  inactive: {
    icon: Clock,
    title: '입장할 수 없는 방이에요',
    description: '오랫동안 활동이 없어 자동으로 비활성 처리된 방이에요.',
    toneClass: 'room-entry-status-warning text-warning',
  },
} as const;

export function RoomJoinView({
  code,
  state = 'default',
  onCancel,
  onCodeChange,
  onSubmit,
}: RoomJoinViewProps) {
  const isLoading = state === 'loading';
  const isInvalid = state === 'invalid-code';
  const isUnavailable = state === 'closed' || state === 'inactive';
  const canSubmit = code.length === ROOM_JOIN_MAX_LENGTH && !isLoading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  let content = (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <RoomJoinCodeField code={code} hasError={isInvalid} onCodeChange={onCodeChange} />
      <RoomJoinActions canSubmit={canSubmit} isInvalid={isInvalid} onCancel={onCancel} />
    </form>
  );

  if (isUnavailable) {
    content = <RoomJoinUnavailable code={code} state={state} onCancel={onCancel} />;
  }

  if (isLoading) {
    content = <RoomJoinLoading />;
  }

  return (
    <main className="room-entry-shell flex flex-1 justify-center px-5 py-24 text-foreground md:px-6 md:py-28">
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="room-entry-brand-mark flex size-8 items-center justify-center rounded-2xl text-background md:hidden">
              <Headphones className="size-4" aria-hidden />
            </span>
            <span className="hidden md:inline-flex">
              <RoomIcon name="brand" className="h-8 w-8 text-primary drop-shadow-lg" />
            </span>
            <span className="font-bold tracking-tight">Syfity</span>
          </div>
          <button
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            type="button"
            onClick={onCancel}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            홈으로
          </button>
        </header>

        <section className="room-entry-card rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-5">
            <RoomJoinCardHeader />
            <div className="h-px bg-white/10" />

            {content}
          </div>
        </section>
      </div>
    </main>
  );
}

function RoomJoinCardHeader() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="room-entry-brand-mark flex size-12 items-center justify-center rounded-2xl text-background">
        <Headphones className="size-6" aria-hidden />
      </span>
      <div className="max-w-64">
        <h1 className="text-lg leading-7 font-bold">초대 코드로 입장</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          초대 코드를 입력하거나 받은 초대 링크를 붙여넣으세요
        </p>
      </div>
    </div>
  );
}

function RoomJoinCodeField({
  code,
  hasError,
  onCodeChange,
}: {
  code: string;
  hasError: boolean;
  onCodeChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-white/55" htmlFor="room-join-code-input">
        초대 코드
      </label>
      <input
        id="room-join-code-input"
        className={cn(
          'h-14 rounded-2xl border bg-input px-4 text-center font-mono text-lg font-bold tracking-widest text-primary uppercase transition-colors outline-none',
          'placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-white/45',
          'focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/30',
          hasError
            ? 'border-destructive/60 bg-destructive/10 text-destructive focus-visible:ring-destructive/30'
            : 'border-border',
        )}
        value={code}
        inputMode="text"
        maxLength={ROOM_JOIN_MAX_LENGTH}
        placeholder="예: 3F9A2C"
        aria-invalid={hasError}
        aria-describedby={hasError ? 'room-join-code-error' : 'room-join-code-count'}
        onChange={(event) => onCodeChange(parseInviteCode(event.target.value))}
        onPaste={(event) => {
          const pastedText = event.clipboardData.getData('text');
          const parsedCode = parseInviteCode(pastedText);

          if (parsedCode) {
            event.preventDefault();
            onCodeChange(parsedCode);
          }
        }}
      />
      {hasError ? (
        <span
          id="room-join-code-error"
          className="flex items-center gap-1.5 text-xs font-semibold text-destructive"
        >
          <AlertCircle className="size-3.5" aria-hidden />
          유효하지 않은 초대 코드예요. 다시 확인해주세요.
        </span>
      ) : (
        <span id="room-join-code-count" className="text-right text-xs text-white/25">
          {code.length} / {ROOM_JOIN_MAX_LENGTH}
        </span>
      )}
    </div>
  );
}

function RoomJoinActions({
  canSubmit,
  isInvalid,
  onCancel,
}: {
  canSubmit: boolean;
  isInvalid: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Button
        variant="ghost"
        size="lg"
        className="order-2 rounded-2xl md:order-1 md:flex-1"
        type="button"
        onClick={onCancel}
      >
        취소
      </Button>
      <Button
        variant="primary"
        size="lg"
        className={cn('order-1 rounded-2xl md:order-2 md:basis-2/3', !canSubmit && 'bg-primary/30')}
        disabled={!canSubmit}
        type="submit"
      >
        <LogIn className="size-4" aria-hidden />
        {isInvalid ? '다시 시도' : '입장하기'}
      </Button>
    </div>
  );
}

function RoomJoinLoading() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="room-entry-status-primary flex size-16 items-center justify-center rounded-2xl border text-primary">
        <Loader2 className="size-7 animate-spin" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold">방에 입장하는 중...</p>
        <p className="mt-1 text-xs text-muted-foreground">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}

function RoomJoinUnavailable({
  code,
  state,
  onCancel,
}: {
  code: string;
  state: 'closed' | 'inactive';
  onCancel: () => void;
}) {
  const content = roomJoinErrorContent[state];
  const Icon = content.icon;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-white/5 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-white/25 uppercase">
        {code || '3F9A2C'}
      </div>
      <div className={cn('rounded-2xl border px-4 py-5 text-center', content.toneClass)}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-current bg-current/10">
          <Icon className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-bold text-foreground">{content.title}</p>
        <p className="mx-auto mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
          {content.description}
        </p>
      </div>
      <Button variant="ghost" size="lg" className="rounded-2xl" type="button" onClick={onCancel}>
        <Home className="size-4" aria-hidden />
        홈으로 돌아가기
      </Button>
    </div>
  );
}

export function parseInviteCode(value: string) {
  const queryCode = getInviteCodeFromUrl(value);
  const source = queryCode ?? value;

  return source
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, ROOM_JOIN_MAX_LENGTH)
    .toUpperCase();
}

function getInviteCodeFromUrl(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get('code') ?? undefined;
  } catch {
    return undefined;
  }
}

export type { RoomJoinState };
