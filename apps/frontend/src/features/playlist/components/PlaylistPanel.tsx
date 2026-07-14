'use client';

// Playlist 데이터 훅과 패널 UI 조합을 담당한다.
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistEmptyState } from './PlaylistEmptyState';
import { PlaylistErrorState } from './PlaylistErrorState';
import { PlaylistItemRow } from './PlaylistItemRow';
import { PlaylistLoadingState } from './PlaylistLoadingState';
import { PlaylistMutationError } from './PlaylistMutationError';
import { PlaylistPanelHeader } from './PlaylistPanelHeader';
import type { PlaylistApi } from '../api/playlistApi';
import { useDeletePlaylistItem, usePlaylist, useReorderPlaylist } from '../hooks/playlistHooks';
import { usePlaylistReorderInteraction } from '../hooks/usePlaylistReorderInteraction';
import { usePlaylistStore } from '../store/playlistStore';

interface PlaylistPanelProps {
  canControlRoom: boolean;
  currentPlaylistItemId: string | null;
  playlistItems?: PlaylistItem[];
  roomId: string;
  isHost: boolean;
  isReady: boolean;
  onOpenSearch: () => void;
  playlistApiClient?: PlaylistApi;
}

export function PlaylistPanel({
  canControlRoom,
  currentPlaylistItemId,
  playlistItems,
  roomId,
  isHost,
  isReady,
  onOpenSearch,
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

  const resetMutationErrors = () => {
    deletePlaylistItem.reset();
    reorderPlaylist.reset();
  };

  const handleOpenSearch = () => {
    if (!canControlRoom) {
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
    draggingItemId,
    focusedActionItemId,
    handleDragHandlePointerDown,
    handleDragHandlePointerMove,
    handleDragHandlePointerUp,
    handleKeyboardReorder,
    handleRowBlur,
    preventMouseFocus,
    setActiveDraggingItemId,
    setFocusedActionItemId,
  } = usePlaylistReorderInteraction({
    canControlRoom,
    isReady,
    onBeforeReorder: resetMutationErrors,
    onReorder: reorderPlaylist.mutate,
    playlist: visiblePlaylist,
  });

  const handleDelete = (itemId: string) => {
    if (!canControlRoom) {
      return;
    }

    resetMutationErrors();
    deletePlaylistItem.mutate(itemId);
  };

  return (
    <aside className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      <PlaylistPanelHeader
        disabled={!canControlRoom}
        isBackgroundFetching={isBackgroundFetching}
        itemCount={visiblePlaylist.length}
        onAddClick={handleOpenSearch}
      />

      {mutationErrorMessage ? <PlaylistMutationError message={mutationErrorMessage} /> : null}

      <div className="min-w-0 flex-1 overflow-y-auto">
        {isInitialLoading ? <PlaylistLoadingState /> : null}
        {isPlaylistError ? (
          <PlaylistErrorState
            errorMessage={getApiErrorMessage(playlistError)}
            onRetry={handleRetry}
          />
        ) : null}
        {!isInitialLoading && !isPlaylistError && visiblePlaylist.length === 0 ? (
          <PlaylistEmptyState isReady={isReady && canControlRoom} onAddClick={handleOpenSearch} />
        ) : null}
        {visiblePlaylist.map((item) => {
          const isCurrent = item.id === currentPlaylistItemId;

          return (
            <PlaylistItemRow
              key={item.id}
              isCurrent={isCurrent}
              isDeletePending={deletePlaylistItem.isPending}
              isDragging={draggingItemId === item.id}
              isFocused={focusedActionItemId === item.id}
              isHost={isHost}
              isControlEnabled={canControlRoom}
              isReady={isReady}
              item={item}
              onBlurWithin={(event) => handleRowBlur(event, item.id)}
              onDelete={handleDelete}
              onDragHandlePointerCancel={() => setActiveDraggingItemId(null)}
              onDragHandleKeyDown={handleKeyboardReorder}
              onDragHandlePointerDown={handleDragHandlePointerDown}
              onDragHandlePointerMove={handleDragHandlePointerMove}
              onDragHandlePointerUp={handleDragHandlePointerUp}
              onFocusWithin={() => setFocusedActionItemId(item.id)}
              onPreventMouseFocus={preventMouseFocus}
            />
          );
        })}
      </div>

      <Button
        className="fixed right-5 bottom-24 z-30 rounded-2xl shadow-lg xl:hidden"
        type="button"
        disabled={!canControlRoom}
        onClick={handleOpenSearch}
      >
        <Plus className="h-4 w-4" aria-hidden />곡 추가
      </Button>
    </aside>
  );
}
