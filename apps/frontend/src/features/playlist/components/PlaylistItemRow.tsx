// Playlist 곡 정보와 host 조작 액션을 렌더링한다.
import { CircleAlert, GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { formatDuration } from '@/shared/lib/formatDuration';
import { cn } from '@/shared/lib/utils';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistArtwork } from './PlaylistArtwork';

interface PlaylistItemRowProps {
  isCurrent: boolean;
  isControlEnabled: boolean;
  isDeletePending: boolean;
  isDragging: boolean;
  isFocused: boolean;
  isHost: boolean;
  isReady: boolean;
  item: PlaylistItem;
  onBlurWithin: (event: React.FocusEvent<HTMLDivElement>) => void;
  onDelete: (itemId: string) => void;
  onDragHandlePointerCancel: () => void;
  onDragHandleKeyDown: (itemId: string, direction: -1 | 1) => void;
  onDragHandlePointerDown: (itemId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragHandlePointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragHandlePointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onFocusWithin: () => void;
  onPreventMouseFocus: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function PlaylistItemRow({
  isCurrent,
  isControlEnabled,
  isDeletePending,
  isDragging,
  isFocused,
  isHost,
  isReady,
  item,
  onBlurWithin,
  onDelete,
  onDragHandlePointerCancel,
  onDragHandleKeyDown,
  onDragHandlePointerDown,
  onDragHandlePointerMove,
  onDragHandlePointerUp,
  onFocusWithin,
  onPreventMouseFocus,
}: PlaylistItemRowProps) {
  const isUnavailable = item.status === 'unavailable';
  const actionVisibilityClass = isFocused
    ? 'flex opacity-100'
    : 'hidden xl:flex xl:opacity-0 xl:group-hover:opacity-100';

  return (
    <div
      data-testid={`playlist-row-${item.id}`}
      data-playlist-item-id={item.id}
      className={cn(
        'group min-w-0 overflow-hidden border-b border-border px-4 py-3 transition',
        isCurrent ? 'bg-primary/5' : 'hover:bg-muted/20',
        isDragging && 'opacity-60',
      )}
      onBlurCapture={onBlurWithin}
      onClick={onFocusWithin}
      onFocusCapture={onFocusWithin}
      tabIndex={isHost ? 0 : undefined}
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
          <p className={cn('mt-1 truncate text-xs', getMetaColorClass(isUnavailable))}>
            {item.channelTitle}
            <span className="mx-1">·</span>
            {formatDuration(item.duration)}
          </p>
        </div>
        <div
          data-testid={`playlist-actions-${item.id}`}
          className={cn(
            'shrink-0 items-center gap-2 transition',
            isHost ? actionVisibilityClass : 'hidden',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-10 w-10 cursor-grab touch-none rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted active:cursor-grabbing xl:h-8 xl:w-8',
              !isReady && 'cursor-not-allowed',
            )}
            disabled={!isReady || !isControlEnabled}
            draggable={false}
            type="button"
            data-testid={`playlist-drag-handle-${item.id}`}
            aria-label={`${item.title} 순서 변경`}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
                return;
              }

              event.preventDefault();
              onDragHandleKeyDown(item.id, event.key === 'ArrowUp' ? -1 : 1);
            }}
            onPointerCancel={onDragHandlePointerCancel}
            onPointerDown={(event) => {
              onPreventMouseFocus(event);
              onDragHandlePointerDown(item.id, event);
            }}
            onPointerMove={onDragHandlePointerMove}
            onPointerUp={onDragHandlePointerUp}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border-0 bg-destructive/10 text-destructive hover:bg-destructive/15 xl:h-8 xl:w-8 xl:bg-transparent xl:text-destructive/70 xl:hover:bg-destructive/10"
            disabled={!isReady || !isControlEnabled || isDeletePending}
            type="button"
            aria-label={`${item.title} 삭제`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item.id);
            }}
            onPointerDown={onPreventMouseFocus}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
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

function getMetaColorClass(isUnavailable: boolean) {
  return isUnavailable ? 'text-muted-foreground/60' : 'text-muted-foreground';
}
