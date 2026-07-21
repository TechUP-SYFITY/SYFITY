'use client';

import { Categories, type CategoryConfig, EmojiStyle, Theme } from 'emoji-picker-react';
import { SmilePlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const PICKER_GAP = 8;
const PICKER_MAX_HEIGHT = 300;
const PICKER_MAX_WIDTH = 350;
const VIEWPORT_MARGIN = 8;

const CHAT_EMOJI_CATEGORIES = [
  { category: Categories.SUGGESTED, name: 'Frequently Used' },
  { category: Categories.CUSTOM, name: 'Custom Emojis' },
  { category: Categories.SMILEYS_PEOPLE, name: 'Smileys & People' },
  { category: Categories.ANIMALS_NATURE, name: 'Animals & Nature' },
  { category: Categories.FOOD_DRINK, name: 'Food & Drink' },
  { category: Categories.TRAVEL_PLACES, name: 'Travel & Places' },
  { category: Categories.ACTIVITIES, name: 'Activities' },
  { category: Categories.OBJECTS, name: 'Objects' },
  { category: Categories.SYMBOLS, name: 'Symbols' },
] satisfies CategoryConfig[];

interface ChatEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

function getPickerSize(anchorRect: DOMRect): CSSProperties {
  const visualViewport = window.visualViewport;
  const viewportHeight = visualViewport?.height ?? window.innerHeight;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  const viewportWidth = visualViewport?.width ?? window.innerWidth;
  const availableWidth = Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2);
  const anchorWidth = anchorRect.width > 0 ? anchorRect.width : availableWidth;
  const width = Math.min(PICKER_MAX_WIDTH, availableWidth, anchorWidth);
  const availableHeight = Math.max(0, anchorRect.top - viewportTop - VIEWPORT_MARGIN - PICKER_GAP);
  const height = Math.min(
    PICKER_MAX_HEIGHT,
    availableHeight,
    Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2),
  );

  return { width, height, zIndex: 50 };
}

export function ChatEmojiPicker({ onEmojiSelect }: ChatEmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerSize, setPickerSize] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldRestoreTriggerFocusRef = useRef(true);
  const virtualAnchorRef = useRef({
    getBoundingClientRect: () => {
      const container = containerRef.current;
      const anchor = container?.closest('form') ?? container;

      return anchor?.getBoundingClientRect() ?? new DOMRect();
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (open) {
      shouldRestoreTriggerFocusRef.current = true;
    } else {
      setPickerSize(null);
    }

    setIsOpen(open);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    let animationFrameId: number | null = null;
    const passiveListenerOptions = { passive: true } as const;
    const windowScrollListenerOptions = { capture: true, passive: true } as const;

    const updatePickerSize = () => {
      const container = containerRef.current;
      const anchor = container?.closest('form') ?? container;

      if (!anchor) return;

      setPickerSize(getPickerSize(anchor.getBoundingClientRect()));
    };

    const schedulePickerSizeUpdate = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updatePickerSize();
      });
    };

    updatePickerSize();
    window.addEventListener('resize', schedulePickerSizeUpdate);
    window.addEventListener('scroll', schedulePickerSizeUpdate, windowScrollListenerOptions);
    window.visualViewport?.addEventListener('resize', schedulePickerSizeUpdate);
    window.visualViewport?.addEventListener(
      'scroll',
      schedulePickerSizeUpdate,
      passiveListenerOptions,
    );

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', schedulePickerSizeUpdate);
      window.removeEventListener('scroll', schedulePickerSizeUpdate, windowScrollListenerOptions);
      window.visualViewport?.removeEventListener('resize', schedulePickerSizeUpdate);
      window.visualViewport?.removeEventListener('scroll', schedulePickerSizeUpdate);
    };
  }, [isOpen]);

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={virtualAnchorRef} />
      <div ref={containerRef} className="shrink-0">
        <PopoverPrimitive.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="mb-0.5 h-7 w-7 rounded-xl border-0 bg-transparent text-muted-foreground hover:bg-transparent"
            type="button"
            aria-label="이모지 선택기 열기"
          >
            <SmilePlus className="h-4 w-4" aria-hidden />
          </Button>
        </PopoverPrimitive.Trigger>
      </div>
      {isOpen && pickerSize ? (
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            asChild
            align="end"
            collisionPadding={VIEWPORT_MARGIN}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => {
              if (!shouldRestoreTriggerFocusRef.current) {
                event.preventDefault();
              }
            }}
            side="top"
            sideOffset={PICKER_GAP}
          >
            <div className="chat-emoji-picker" style={pickerSize}>
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
                  shouldRestoreTriggerFocusRef.current = false;
                  onEmojiSelect(emojiData.emoji);
                  handleOpenChange(false);
                }}
              />
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      ) : null}
    </PopoverPrimitive.Root>
  );
}
