'use client';

// Playlist 데이터 훅과 패널 UI 조합을 담당한다.
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect } from 'react';

import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistAddMenu } from './PlaylistAddMenu';
import { PlaylistEmptyState } from './PlaylistEmptyState';
import { PlaylistErrorState } from './PlaylistErrorState';
import { PlaylistLoadingState } from './PlaylistLoadingState';
import { PlaylistMutationError } from './PlaylistMutationError';
import { PlaylistPanelHeader } from './PlaylistPanelHeader';
import { SortablePlaylistItemRow } from './SortablePlaylistItemRow';
import type { PlaylistApi } from '../api/playlistApi';
import { useDeletePlaylistItem, usePlaylist, useReorderPlaylist } from '../hooks/playlistHooks';
import { usePlaylistReorderInteraction } from '../hooks/usePlaylistReorderInteraction';
import { usePlaylistStore } from '../store/playlistStore';

interface PlaylistPanelProps {
  canControlRoom: boolean;
  currentPlaylistItemId: string | null;
  currentUserId?: string;
  isActiveRoomMember: boolean;
  playlistItems?: PlaylistItem[];
  roomId: string;
  isHost: boolean;
  isReady: boolean;
  isSelectPending?: boolean;
  onOpenSearch: () => void;
  onOpenImport?: () => void;
  onSelectItem?: (itemId: string) => void;
  playlistApiClient?: PlaylistApi;
}

const screenReaderInstructions = {
  draggable: '위쪽 또는 아래쪽 화살표 키로 재생목록 순서를 변경할 수 있습니다.',
};

export function PlaylistPanel({
  canControlRoom,
  currentPlaylistItemId,
  currentUserId,
  isActiveRoomMember,
  playlistItems,
  roomId,
  isHost,
  isReady,
  isSelectPending = false,
  onOpenSearch,
  onOpenImport,
  onSelectItem,
  playlistApiClient,
}: PlaylistPanelProps) {
  const shouldUseParentPlaylist = Boolean(playlistItems);
  const {
    data,
    error: playlistError,
    isError: isPlaylistError,
    isFetching,
    isLoading,
    refetch,
  } = usePlaylist(roomId, isReady && !shouldUseParentPlaylist, playlistApiClient);
  const deletePlaylistItem = useDeletePlaylistItem(roomId, playlistApiClient);
  const reorderPlaylist = useReorderPlaylist(roomId, playlistApiClient);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
  const visiblePlaylist = playlistItems ?? playlist;
  const isInitialLoading = isLoading && visiblePlaylist.length === 0;
  const isBackgroundFetching = isFetching && !isLoading && visiblePlaylist.length > 0;
  const mutationError = deletePlaylistItem.error ?? reorderPlaylist.error;
  const mutationErrorMessage = mutationError ? getApiErrorMessage(mutationError) : undefined;
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 4 },
  });
  const sensors = useSensors(pointerSensor);

  const resetMutationErrors = () => {
    deletePlaylistItem.reset();
    reorderPlaylist.reset();
  };

  const handleOpenSearch = () => {
    if (!isActiveRoomMember) {
      return;
    }

    resetMutationErrors();
    onOpenSearch();
  };

  const handleRetry = async () => {
    const result = await refetch();

    if (result.isSuccess) {
      resetMutationErrors();
    }
  };

  useEffect(() => {
    if (!shouldUseParentPlaylist && data?.playlist) {
      setPlaylist(data.playlist);
    }
  }, [data?.playlist, setPlaylist, shouldUseParentPlaylist]);

  const {
    dropPosition,
    dropTargetItemId,
    focusedActionItemId,
    handleDragCancel,
    handleDragEnd,
    handleDragOver,
    handleDragStart,
    handleKeyboardReorder,
    handleRowBlur,
    preventMouseFocus,
    setFocusedActionItemId,
  } = usePlaylistReorderInteraction({
    canControlRoom,
    isReady,
    onBeforeReorder: resetMutationErrors,
    onReorder: reorderPlaylist.mutate,
    playlist: visiblePlaylist,
  });

  const canDeleteItem = (item: PlaylistItem) => {
    if (isHost) {
      return canControlRoom;
    }

    return isActiveRoomMember && item.addedBy === currentUserId;
  };

  const canSelectItem = (item: PlaylistItem) =>
    isHost &&
    canControlRoom &&
    isReady &&
    !isSelectPending &&
    item.id !== currentPlaylistItemId &&
    item.status !== 'unavailable';

  const handleDelete = (itemId: string) => {
    const item = visiblePlaylist.find((candidate) => candidate.id === itemId);

    if (!item || !canDeleteItem(item)) {
      return;
    }

    resetMutationErrors();
    deletePlaylistItem.mutate(itemId);
  };

  const handleSelect = (itemId: string) => {
    const item = visiblePlaylist.find((candidate) => candidate.id === itemId);

    if (!item || !canSelectItem(item)) {
      return;
    }

    onSelectItem?.(itemId);
  };

  return (
    <aside className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      <PlaylistPanelHeader
        disabled={!isActiveRoomMember}
        isBackgroundFetching={isBackgroundFetching}
        itemCount={visiblePlaylist.length}
        onAddClick={handleOpenSearch}
        showImport={isHost && Boolean(onOpenImport)}
        onImportClick={onOpenImport}
      />

      {mutationErrorMessage ? <PlaylistMutationError message={mutationErrorMessage} /> : null}

      <div
        className="scrollbar-none min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-16 xl:pb-0"
        data-testid="playlist-scroll-region"
      >
        {isInitialLoading ? <PlaylistLoadingState /> : null}
        {isPlaylistError ? (
          <PlaylistErrorState
            errorMessage={getApiErrorMessage(playlistError)}
            onRetry={handleRetry}
          />
        ) : null}
        {!isInitialLoading && !isPlaylistError && visiblePlaylist.length === 0 ? (
          <PlaylistEmptyState
            isReady={isReady && isActiveRoomMember}
            onAddClick={handleOpenSearch}
          />
        ) : null}
        <DndContext
          accessibility={{ screenReaderInstructions }}
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragCancel={handleDragCancel}
          onDragEnd={(event: DragEndEvent) => handleDragEnd(getOverItemId(event))}
          onDragOver={(event: DragOverEvent) => handleDragOver(getOverItemId(event))}
          onDragStart={(event: DragStartEvent) => handleDragStart(String(event.active.id))}
        >
          <SortableContext
            items={visiblePlaylist.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {visiblePlaylist.map((item) => {
              const isCurrent = item.id === currentPlaylistItemId;

              return (
                <SortablePlaylistItemRow
                  key={item.id}
                  dropPosition={dropTargetItemId === item.id ? dropPosition : null}
                  isCurrent={isCurrent}
                  isDeleteEnabled={canDeleteItem(item)}
                  isDeletePending={deletePlaylistItem.isPending}
                  isFocused={focusedActionItemId === item.id}
                  isHost={isHost}
                  isOwnItem={item.addedBy === currentUserId}
                  isReady={isReady}
                  isReorderEnabled={canControlRoom}
                  isSelectEnabled={Boolean(onSelectItem) && canSelectItem(item)}
                  item={item}
                  onBlurWithin={(event) => handleRowBlur(event, item.id)}
                  onDelete={handleDelete}
                  onDragHandleKeyDown={handleKeyboardReorder}
                  onFocusWithin={() => setFocusedActionItemId(item.id)}
                  onPreventMouseFocus={preventMouseFocus}
                  onSelect={isHost && onSelectItem ? handleSelect : undefined}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      <div
        className="absolute right-3 bottom-4 z-30 xl:hidden"
        data-testid="playlist-mobile-add-action"
      >
        <PlaylistAddMenu
          variant="floating"
          disabled={!isActiveRoomMember}
          showImport={isHost && Boolean(onOpenImport)}
          onAddSearch={handleOpenSearch}
          onImport={onOpenImport}
        />
      </div>
    </aside>
  );
}

function getOverItemId(event: DragEndEvent | DragOverEvent) {
  return event.over ? String(event.over.id) : null;
}
