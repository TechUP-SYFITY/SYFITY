// Playlist 곡 정보와 host 조작 액션을 렌더링한다.
import { CircleAlert, GripVertical, Trash2 } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import { formatDuration } from '@/shared/lib/formatDuration';
import { cn } from '@/shared/lib/utils';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistArtwork } from './PlaylistArtwork';

interface PlaylistItemRowProps {
  // true면 hover 없이 순서변경/삭제 액션을 항상 노출한다 (개인 플레이리스트 상세).
  alwaysShowActions?: boolean;
  isCurrent: boolean;
  isDeleteEnabled: boolean;
  isDeletePending: boolean;
  isDragging: boolean;
  isFocused: boolean;
  isHost: boolean;
  isOwnItem: boolean;
  isReady: boolean;
  isReorderEnabled: boolean;
  // addedBy는 이 컴포넌트에서 쓰지 않으므로, addedBy 없는 개인 플레이리스트 아이템도 받는다.
  item: Omit<PlaylistItem, 'addedBy'>;
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
  alwaysShowActions = false,
  isCurrent,
  isDeleteEnabled,
  isDeletePending,
  isDragging,
  isFocused,
  isHost,
  isOwnItem,
  isReady,
  isReorderEnabled,
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
  // Host는 모든 곡을, Member는 자신이 추가한 곡만 삭제할 수 있다 (docs/05-api-spec.md 6.3).
  const hasRowActions = isHost || isOwnItem;
  const actionVisibilityClass =
    alwaysShowActions || isFocused
      ? 'flex opacity-100'
      : 'hidden xl:flex xl:opacity-0 xl:group-hover:opacity-100';

  return (
    <div
      data-testid={`playlist-row-${item.id}`}
      data-playlist-item-id={item.id}
      className={cn(
        `group min-w-0 overflow-hidden border-b border-border px-4 py-3 transition`,
        isCurrent ? 'bg-primary/5' : 'hover:bg-muted/20',
        isDragging && 'opacity-60',
      )}
      onBlurCapture={onBlurWithin}
      onClick={onFocusWithin}
      onFocusCapture={onFocusWithin}
      tabIndex={hasRowActions ? 0 : undefined}
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
              <CircleAlert className="ml-1 inline-block size-3 text-destructive" aria-hidden />
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
            hasRowActions ? actionVisibilityClass : 'hidden',
          )}
        >
          {isHost ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                `size-10 cursor-grab touch-none rounded-full border-0 bg-transparent text-muted-foreground hover:bg-muted active:cursor-grabbing xl:size-8`,
                !isReady && 'cursor-not-allowed',
              )}
              disabled={!isReady || !isReorderEnabled}
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
              <GripVertical className="size-4" aria-hidden />
            </Button>
          ) : null}
          {hasRowActions ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full border-0 bg-destructive/10 text-destructive hover:bg-destructive/15 xl:size-8 xl:bg-transparent xl:text-destructive/70 xl:hover:bg-destructive/10"
              disabled={!isReady || !isDeleteEnabled || isDeletePending}
              type="button"
              aria-label={`${item.title} 삭제`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item.id);
              }}
              onPointerDown={onPreventMouseFocus}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          ) : null}
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
