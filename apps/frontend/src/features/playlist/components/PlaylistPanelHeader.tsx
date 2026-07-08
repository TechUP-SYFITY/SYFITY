// Playlist 패널 제목과 곡 추가 버튼을 표시한다.
import { ListMusic, Plus } from 'lucide-react';

import { Button } from '@/shared/components/ui';

interface PlaylistPanelHeaderProps {
  isBackgroundFetching: boolean;
  itemCount: number;
  onAddClick: () => void;
}

export function PlaylistPanelHeader({
  isBackgroundFetching,
  itemCount,
  onAddClick,
}: PlaylistPanelHeaderProps) {
  return (
    <div className="hidden h-12 items-center justify-between border-b border-border px-4 xl:flex">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ListMusic className="h-3.5 w-3.5 text-primary" aria-hidden />
        재생목록
        <span className="font-normal text-muted-foreground">{itemCount}곡</span>
        {isBackgroundFetching ? (
          <span className="font-normal text-muted-foreground" aria-live="polite">
            새로고침 중
          </span>
        ) : null}
      </h2>
      <Button
        variant="primary-soft"
        size="sm"
        className="rounded-2xl"
        type="button"
        onClick={onAddClick}
      >
        <Plus className="h-3 w-3" aria-hidden />
        추가
      </Button>
    </div>
  );
}
