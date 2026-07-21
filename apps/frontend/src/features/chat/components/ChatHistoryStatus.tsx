import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface ChatHistoryStatusProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ChatHistoryStatus({ isLoading, isError, onRetry }: ChatHistoryStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        <span>이전 메시지를 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-xs text-muted-foreground">
        <span>이전 메시지를 불러오지 못했어요.</span>
        <Button size="sm" variant="primary-soft" onClick={onRetry}>
          <RefreshCw aria-hidden />
          다시 시도
        </Button>
      </div>
    );
  }

  return null;
}
