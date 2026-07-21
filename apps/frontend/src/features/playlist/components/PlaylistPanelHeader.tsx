// Playlist 패널 제목과 곡 추가/불러오기 컨트롤을 표시한다.
import { ListMusic } from 'lucide-react';

import { PlaylistAddMenu } from './PlaylistAddMenu';

interface PlaylistPanelHeaderProps {
  disabled: boolean;
  isBackgroundFetching: boolean;
  itemCount: number;
  onAddClick: () => void;
  showImport?: boolean;
  onImportClick?: () => void;
}

export function PlaylistPanelHeader({
  disabled,
  isBackgroundFetching,
  itemCount,
  onAddClick,
  showImport = false,
  onImportClick,
}: PlaylistPanelHeaderProps) {
  return (
    <div className="hidden h-12 items-center justify-between border-b border-border px-4 xl:flex">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <ListMusic className="size-4 text-primary" aria-hidden />
        재생목록
        <span className="font-normal text-muted-foreground">{itemCount}곡</span>
        {isBackgroundFetching ? (
          <span className="font-normal text-muted-foreground" aria-live="polite">
            새로고침 중
          </span>
        ) : null}
      </h2>
      <PlaylistAddMenu
        variant="header"
        disabled={disabled}
        showImport={showImport}
        onAddSearch={onAddClick}
        onImport={onImportClick}
      />
    </div>
  );
}
