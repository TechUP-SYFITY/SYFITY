'use client';

// Room Playlist 행에 sortable 드래그 상태와 transform을 연결한다.
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { PlaylistItemRow, type PlaylistItemRowProps } from './PlaylistItemRow';

interface SortablePlaylistItemRowProps extends Omit<PlaylistItemRowProps, 'isDragging'> {
  dropPosition: 'after' | 'before' | null;
}

export function SortablePlaylistItemRow({
  dropPosition,
  isHost,
  isReady,
  isReorderEnabled,
  item,
  ...props
}: SortablePlaylistItemRowProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    attributes: {
      roleDescription: '정렬 가능한 항목',
    },
    disabled: !isHost || !isReady || !isReorderEnabled,
    id: item.id,
  });

  return (
    <PlaylistItemRow
      {...props}
      dragHandleProps={{ ...attributes, ...listeners }}
      dragHandleRef={setActivatorNodeRef}
      dropPosition={dropPosition}
      isDragging={isDragging}
      isHost={isHost}
      isReady={isReady}
      isReorderEnabled={isReorderEnabled}
      item={item}
      rowRef={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
    />
  );
}
