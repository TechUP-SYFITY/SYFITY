'use client';

// Playlist 데이터 훅과 패널 UI 조합을 담당한다.
import { useEffect } from 'react';

import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistAddMenu } from './PlaylistAddMenu';
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
  currentUserId?: string;
  isActiveRoomMember: boolean;
  playlistItems?: PlaylistItem[];
  roomId: string;
  isHost: boolean;
  isReady: boolean;
  onOpenSearch: () => void;
  onOpenImport?: () => void;
  playlistApiClient?: PlaylistApi;
}

export function PlaylistPanel({
  canControlRoom,
  currentPlaylistItemId,
  currentUserId,
  isActiveRoomMember,
  playlistItems,
  roomId,
  isHost,
  isReady,
  onOpenSearch,
  onOpenImport,
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

  const canDeleteItem = (item: PlaylistItem) => {
    if (isHost) {
      return canControlRoom;
    }

    return isActiveRoomMember && item.addedBy === currentUserId;
  };

  const handleDelete = (itemId: string) => {
    const item = visiblePlaylist.find((candidate) => candidate.id === itemId);

    if (!item || !canDeleteItem(item)) {
      return;
    }

    resetMutationErrors();
    deletePlaylistItem.mutate(itemId);
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

      <div className="min-w-0 flex-1 overflow-y-auto">
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
        {visiblePlaylist.map((item) => {
          const isCurrent = item.id === currentPlaylistItemId;

          return (
            <PlaylistItemRow
              key={item.id}
              isCurrent={isCurrent}
              isDeleteEnabled={canDeleteItem(item)}
              isDeletePending={deletePlaylistItem.isPending}
              isDragging={draggingItemId === item.id}
              isFocused={focusedActionItemId === item.id}
              isHost={isHost}
              isOwnItem={item.addedBy === currentUserId}
              isReady={isReady}
              isReorderEnabled={canControlRoom}
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

      {/* aside 자신(position: relative) 기준 absolute — fixed로 두면 조상의 overflow-hidden/auto에
          의해 스크롤 중 클리핑되어 버튼이 스크롤을 따라오지 못하는 것처럼 보인다. 곡 리스트만
          내부에서 스크롤되고 aside 자체 박스는 움직이지 않으므로, absolute로도 항상 패널
          우측 하단에 고정된다. */}
      <div className="absolute right-5 bottom-5 z-30 xl:hidden">
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
