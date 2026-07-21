'use client';

import { EmojiStyle } from 'emoji-picker-react';
import { SmilePlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Button } from '@/shared/components/ui';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ChatEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function ChatEmojiPicker({ onEmojiSelect }: ChatEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="mb-0.5 h-7 w-7 rounded-xl border-0 bg-transparent text-muted-foreground hover:bg-transparent"
        type="button"
        aria-label="이모지 선택기 열기"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <SmilePlus className="h-4 w-4" aria-hidden />
      </Button>
      {isOpen ? (
        <div className="absolute right-0 bottom-[calc(100%+0.5rem)] z-50 h-[min(300px,calc(100dvh-12rem))] w-full max-w-[350px]">
          <EmojiPicker
            emojiStyle={EmojiStyle.NATIVE}
            emojiVersion="13.1"
            height="100%"
            width="100%"
            onEmojiClick={(emojiData) => {
              onEmojiSelect(emojiData.emoji);
              setIsOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
