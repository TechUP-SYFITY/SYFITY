'use client';

import { Send } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';

import { CHAT_MAX_MESSAGE_LENGTH } from '../chatConstants';
import { ChatEmojiPicker } from './ChatEmojiPicker';

interface ChatInputFormProps {
  errorMessage?: string;
  onSubmit: (message: string) => void;
}

export function ChatInputForm({ errorMessage, onSubmit }: ChatInputFormProps) {
  const errorId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursorPositionRef = useRef<number | null>(null);
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? errorMessage;
  const maxLengthError = `메시지는 ${CHAT_MAX_MESSAGE_LENGTH}자를 초과할 수 없어요.`;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    if (pendingCursorPositionRef.current !== null) {
      textarea.focus();
      textarea.setSelectionRange(
        pendingCursorPositionRef.current,
        pendingCursorPositionRef.current,
      );
      pendingCursorPositionRef.current = null;
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;

    if (nextValue.length > CHAT_MAX_MESSAGE_LENGTH) {
      setValue(nextValue.slice(0, CHAT_MAX_MESSAGE_LENGTH));
      setLocalError(maxLengthError);
      return;
    }

    if (localError) {
      setLocalError(null);
    }
    setValue(nextValue);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
      setLocalError(maxLengthError);
      return;
    }

    setLocalError(null);
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    const selectionStart = textarea?.selectionStart ?? value.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const nextValue = `${value.slice(0, selectionStart)}${emoji}${value.slice(selectionEnd)}`;

    if (nextValue.length > CHAT_MAX_MESSAGE_LENGTH) {
      setLocalError(maxLengthError);
      pendingCursorPositionRef.current = selectionStart;
      return;
    }

    pendingCursorPositionRef.current = selectionStart + emoji.length;
    setValue(nextValue);
  };

  return (
    <form className="min-w-0 flex-1" onSubmit={handleSubmit}>
      <div
        className={cn(
          'flex min-h-11 min-w-0 items-end rounded-2xl border bg-input px-3 py-1.5 transition-colors',
          visibleError ? 'border-destructive' : 'border-border',
        )}
      >
        <textarea
          ref={textareaRef}
          className="max-h-28 min-h-8 min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-white/50 focus-visible:ring-0"
          placeholder="메시지 입력..."
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-describedby={visibleError ? errorId : undefined}
          aria-invalid={Boolean(visibleError)}
          aria-label="채팅 메시지 입력"
        />
        <ChatEmojiPicker onEmojiSelect={handleEmojiSelect} />
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 h-7 w-7 shrink-0 rounded-xl border-0 bg-transparent text-muted-foreground hover:bg-transparent"
          type="submit"
          aria-label="메시지 보내기"
        >
          <Send className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
        </Button>
      </div>
      {visibleError ? (
        <p id={errorId} className="px-1 pt-1.5 text-xs text-destructive">
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
