// Playlist 곡 한 줄과 host 제어 액션을 렌더링한다.
import { ArrowDown, ArrowUp, CircleAlert, Play, Trash2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib/utils';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistArtwork } from './PlaylistArtwork';

interface PlaylistItemRowProps {
  isCurrent: boolean;
  isDeletePending: boolean;
  isFocused: boolean;
  isHost: boolean;
  isLast: boolean;
  isReady: boolean;
  item: PlaylistItem;
  onBlurWithin: (event: React.FocusEvent<HTMLDivElement>) => void;
  onDelete: (itemId: string) => void;
  onFocusWithin: () => void;
  onMove: (itemId: string, direction: -1 | 1) => void;
  onPlay: (itemId: string) => void;
  onPreventMouseFocus: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function PlaylistItemRow({
  isCurrent,
  isDeletePending,
  isFocused,
  isHost,
  isLast,
  isReady,
  item,
  onBlurWithin,
  onDelete,
  onFocusWithin,
  onMove,
  onPlay,
  onPreventMouseFocus,
}: PlaylistItemRowProps) {
  const isUnavailable = item.status === 'unavailable';
  const actionVisibilityClass = isFocused
    ? 'xl:opacity-100'
    : 'xl:opacity-0 xl:group-hover:opacity-100';

  return (
    <div
      className={cn(
        'group min-w-0 overflow-hidden border-b border-border px-4 py-3 transition',
        isCurrent ? 'bg-primary/5' : 'hover:bg-muted/20',
      )}
      onBlurCapture={onBlurWithin}
      onFocusCapture={onFocusWithin}
    >
      <div className="flex min-h-10 min-w-0 items-center gap-3">
        <PlaylistArtwork item={item} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-bold',
              getTitleColorClass(isCurrent, isUnavailable),
            )}
          >
            {item.title}
            {isUnavailable ? (
              <CircleAlert className="ml-1 inline-block h-3 w-3 text-destructive" aria-hidden />
            ) : null}
          </p>
          <p className={cn('mt-1 truncate text-xs', 'text-muted-foreground')}>
            {item.channelTitle}
            <span className="mx-1">·</span>
            {formatDuration(item.duration)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0 rounded-full border-0 bg-transparent text-muted-foreground opacity-100 hover:bg-muted',
            actionVisibilityClass,
            !isHost && 'hidden',
          )}
          disabled={!isReady || !isHost || isUnavailable}
          type="button"
          aria-label={`${item.title} 재생`}
          onPointerDown={onPreventMouseFocus}
          onClick={() => onPlay(item.id)}
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <div
          className={cn(
            'flex shrink-0 items-center gap-1 opacity-100 transition',
            actionVisibilityClass,
            !isHost && 'hidden',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted"
            disabled={!isReady || !isHost || isCurrent}
            type="button"
            data-testid={`playlist-move-up-${item.id}`}
            onPointerDown={onPreventMouseFocus}
            onClick={() => onMove(item.id, -1)}
            aria-label={`${item.title} 위로 이동`}
          >
            <ArrowUp className="h-3 w-3" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted"
            disabled={!isReady || !isHost || isLast}
            type="button"
            data-testid={`playlist-move-down-${item.id}`}
            onPointerDown={onPreventMouseFocus}
            onClick={() => onMove(item.id, 1)}
            aria-label={`${item.title} 아래로 이동`}
          >
            <ArrowDown className="h-3 w-3" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full border-0 bg-transparent text-destructive/70 hover:bg-destructive/10"
            disabled={!isReady || isDeletePending}
            type="button"
            aria-label={`${item.title} 삭제`}
            onPointerDown={onPreventMouseFocus}
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getTitleColorClass(isCurrent: boolean, isUnavailable: boolean) {
  if (isCurrent) {
    return 'text-primary';
  }

  return isUnavailable ? 'text-muted-foreground' : 'text-foreground';
}

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
