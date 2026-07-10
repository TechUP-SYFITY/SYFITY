'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Input } from '@/shared/components/ui';

import { CHAT_MAX_MESSAGE_LENGTH } from '../chatConstants';

interface ChatInputFormProps {
  errorMessage?: string;
  onSubmit: (message: string) => void;
}

export function ChatInputForm({ errorMessage, onSubmit }: ChatInputFormProps) {
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? errorMessage;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
      setLocalError(`메시지는 ${CHAT_MAX_MESSAGE_LENGTH}자를 초과할 수 없어요.`);
      return;
    }

    setLocalError(null);
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form
      className="flex h-11 min-w-0 flex-1 items-center rounded-2xl border border-border bg-input px-3"
      onSubmit={handleSubmit}
    >
      <div className="min-w-0 flex-1">
        <Input
          className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          error={visibleError}
          maxLength={CHAT_MAX_MESSAGE_LENGTH}
          placeholder="메시지 입력..."
          value={value}
          onChange={(event) => {
            if (localError) {
              setLocalError(null);
            }
            setValue(event.target.value);
          }}
          aria-label="채팅 메시지 입력"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-xl border-0 bg-transparent text-muted-foreground hover:bg-transparent"
        type="submit"
        aria-label="메시지 보내기"
      >
        <Send className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
      </Button>
    </form>
  );
}
