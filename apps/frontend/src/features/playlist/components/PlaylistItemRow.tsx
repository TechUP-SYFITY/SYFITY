// Playlist 곡 정보와 host 조작 액션을 렌더링한다.
import { CircleAlert, GripVertical, Trash2 } from 'lucide-react';
import type { CSSProperties, HTMLAttributes, Ref } from 'react';

import { Button } from '@/shared/components/ui';
import { formatDuration } from '@/shared/lib/formatDuration';
import { cn } from '@/shared/lib/utils';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistArtwork } from './PlaylistArtwork';

export interface PlaylistItemRowProps {
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
  dropPosition?: 'after' | 'before' | null;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: Ref<HTMLButtonElement>;
  // addedBy는 이 컴포넌트에서 쓰지 않으므로, addedBy 없는 개인 플레이리스트 아이템도 받는다.
  item: Omit<PlaylistItem, 'addedBy'>;
  onBlurWithin: (event: React.FocusEvent<HTMLDivElement>) => void;
  onDelete: (itemId: string) => void;
  onDragHandlePointerCancel?: () => void;
  onDragHandleKeyDown: (itemId: string, direction: -1 | 1) => void;
  onDragHandlePointerDown?: (itemId: string, event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragHandlePointerMove?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onDragHandlePointerUp?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onFocusWithin: () => void;
  onPreventMouseFocus: (event: React.PointerEvent<HTMLButtonElement>) => void;
  rowRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}

export function PlaylistItemRow({
  alwaysShowActions = false,
  dragHandleProps,
  dragHandleRef,
  dropPosition = null,
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
  rowRef,
  style,
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
      ref={rowRef}
      data-testid={`playlist-row-${item.id}`}
      data-playlist-item-id={item.id}
      data-drop-position={dropPosition ?? undefined}
      style={style}
      className={cn(
        `group relative min-w-0 overflow-hidden border-b border-border px-4 py-3 transition-colors duration-150 ease-out motion-reduce:transition-none`,
        isCurrent ? 'bg-primary/5' : 'hover:bg-muted/20',
        isDragging && 'z-10 bg-background opacity-90 shadow-md ring-1 ring-primary/40',
        dropPosition === 'before' &&
          'before:absolute before:inset-x-0 before:top-0 before:z-20 before:h-0.5 before:bg-primary',
        dropPosition === 'after' &&
          'after:absolute after:inset-x-0 after:bottom-0 after:z-20 after:h-0.5 after:bg-primary',
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
              {...dragHandleProps}
              ref={dragHandleRef}
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
              aria-pressed={isDragging}
              onPointerCancel={dragHandleProps?.onPointerCancel ?? onDragHandlePointerCancel}
              onPointerDown={(event) => {
                if (dragHandleProps?.onPointerDown) {
                  dragHandleProps.onPointerDown(event);
                  onPreventMouseFocus(event);
                  return;
                }

                onPreventMouseFocus(event);
                onDragHandlePointerDown?.(item.id, event);
              }}
              onPointerMove={dragHandleProps?.onPointerMove ?? onDragHandlePointerMove}
              onPointerUp={dragHandleProps?.onPointerUp ?? onDragHandlePointerUp}
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
