// Playlist가 비어 있을 때 곡 추가 안내를 표시한다.
import { Inbox, Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface PlaylistEmptyStateProps {
  isReady: boolean;
  onAddClick: () => void;
}

export function PlaylistEmptyState({ isReady, onAddClick }: PlaylistEmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-input text-muted-foreground">
        <Inbox className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-bold text-foreground">아직 곡이 없어요</p>
      <p className="mt-2 text-xs/5 text-muted-foreground">검색하거나 링크로 곡을 추가해보세요.</p>
      <Button className="mt-6 rounded-2xl" disabled={!isReady} type="button" onClick={onAddClick}>
        <Plus className="size-4" aria-hidden />첫 번째 곡 추가
      </Button>
    </div>
  );
}
