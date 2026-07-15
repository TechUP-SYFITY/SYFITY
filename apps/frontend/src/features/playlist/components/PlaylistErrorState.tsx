// Playlist 조회 실패 상태와 재시도 액션을 표시한다.
import { CircleAlert } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface PlaylistErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export function PlaylistErrorState({ errorMessage, onRetry }: PlaylistErrorStateProps) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
        <CircleAlert className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-bold text-foreground">재생목록을 불러오지 못했어요</p>
      <p className="mt-2 text-xs/5 text-muted-foreground">{errorMessage}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-5 rounded-2xl"
        type="button"
        onClick={onRetry}
      >
        다시 시도
      </Button>
    </div>
  );
}
