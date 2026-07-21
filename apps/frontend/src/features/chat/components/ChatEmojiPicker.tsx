'use client';

import { Categories, EmojiStyle, Theme } from 'emoji-picker-react';
import { SmilePlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/shared/components/ui';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const PICKER_GAP = 8;
const PICKER_MAX_HEIGHT = 300;
const PICKER_MAX_WIDTH = 350;
const VIEWPORT_MARGIN = 8;

const CHAT_EMOJI_CATEGORIES = [
  Categories.SUGGESTED,
  Categories.CUSTOM,
  Categories.SMILEYS_PEOPLE,
  Categories.ANIMALS_NATURE,
  Categories.FOOD_DRINK,
  Categories.TRAVEL_PLACES,
  Categories.ACTIVITIES,
  Categories.OBJECTS,
  Categories.SYMBOLS,
];

interface ChatEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

function getPickerPosition(anchorRect: DOMRect): CSSProperties {
  const visualViewport = window.visualViewport;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const availableWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2);
  const anchorWidth = anchorRect.width > 0 ? anchorRect.width : availableWidth;
  const width = Math.min(PICKER_MAX_WIDTH, availableWidth, anchorWidth);
  const minLeft = viewportLeft + VIEWPORT_MARGIN;
  const maxLeft = Math.max(minLeft, viewportLeft + viewportWidth - VIEWPORT_MARGIN - width);
  const left = Math.min(Math.max(anchorRect.right - width, minLeft), maxLeft);
  const availableHeight = Math.max(0, anchorRect.top - viewportTop - VIEWPORT_MARGIN - PICKER_GAP);
  const height = Math.min(
    PICKER_MAX_HEIGHT,
    availableHeight,
    Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2),
  );
  const minTop = viewportTop + VIEWPORT_MARGIN;
  const maxTop = Math.max(minTop, viewportTop + viewportHeight - VIEWPORT_MARGIN - height);
  const top = Math.min(Math.max(anchorRect.top - PICKER_GAP - height, minTop), maxTop);

  return { position: 'fixed', top, left, width, height, zIndex: 50 };
}

export function ChatEmojiPicker({ onEmojiSelect }: ChatEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePickerPosition = () => {
      const container = containerRef.current;
      const anchor = container?.closest('form') ?? container;

      if (!anchor) return;

      setPickerPosition(getPickerPosition(anchor.getBoundingClientRect()));
    };

    updatePickerPosition();
    window.addEventListener('resize', updatePickerPosition);
    window.addEventListener('scroll', updatePickerPosition, true);
    window.visualViewport?.addEventListener('resize', updatePickerPosition);
    window.visualViewport?.addEventListener('scroll', updatePickerPosition);

    return () => {
      window.removeEventListener('resize', updatePickerPosition);
      window.removeEventListener('scroll', updatePickerPosition, true);
      window.visualViewport?.removeEventListener('resize', updatePickerPosition);
      window.visualViewport?.removeEventListener('scroll', updatePickerPosition);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="mb-0.5 h-7 w-7 rounded-xl border-0 bg-transparent text-muted-foreground hover:bg-transparent"
        type="button"
        aria-label="이모지 선택기 열기"
        aria-expanded={isOpen}
        onClick={() => {
          setPickerPosition(null);
          setIsOpen((current) => !current);
        }}
      >
        <SmilePlus className="h-4 w-4" aria-hidden />
      </Button>
      {isOpen && pickerPosition
        ? createPortal(
            <div className="chat-emoji-picker" style={pickerPosition}>
              <EmojiPicker
                categories={CHAT_EMOJI_CATEGORIES}
                emojiStyle={EmojiStyle.NATIVE}
                emojiVersion="12.1"
                height="100%"
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                theme={Theme.DARK}
                width="100%"
                onEmojiClick={(emojiData) => {
                  onEmojiSelect(emojiData.emoji);
                  setPickerPosition(null);
                  setIsOpen(false);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
