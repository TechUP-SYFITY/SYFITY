import { ArrowDown } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ isVisible, onClick }: ScrollToBottomButtonProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Button
      aria-label="맨 아래로 이동"
      className="absolute right-4 bottom-4 z-10 rounded-full border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-sm hover:bg-muted"
      onClick={onClick}
      size="sm"
      variant="primary-soft"
    >
      <ArrowDown aria-hidden />맨 아래로
    </Button>
  );
}
