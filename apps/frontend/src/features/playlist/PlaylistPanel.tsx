'use client';

// Playlist 데이터 훅과 패널 UI 조합을 담당한다.
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui';
import { ApiClientError } from '@/shared/types/api';
import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistAddForm } from './components/PlaylistAddForm';
import { PlaylistEmptyState } from './components/PlaylistEmptyState';
import { PlaylistErrorState } from './components/PlaylistErrorState';
import { PlaylistItemRow } from './components/PlaylistItemRow';
import { PlaylistLoadingState } from './components/PlaylistLoadingState';
import { PlaylistMutationError } from './components/PlaylistMutationError';
import { PlaylistPanelHeader } from './components/PlaylistPanelHeader';
import type { PlaylistApi } from './playlistApi';
import {
  useAddPlaylistItem,
  useDeletePlaylistItem,
  usePlaylist,
  useReorderPlaylist,
} from './playlistHooks';
import { usePlaylistStore } from './playlistStore';

interface PlaylistPanelProps {
  playlistItems?: PlaylistItem[];
  roomId: string;
  isHost: boolean;
  isReady: boolean;
  playlistApiClient?: PlaylistApi;
}

export function PlaylistPanel({
  playlistItems,
  roomId,
  isHost,
  isReady,
  playlistApiClient,
}: PlaylistPanelProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const draggingItemIdRef = useRef<string | null>(null);
  const [focusedActionItemId, setFocusedActionItemId] = useState<string | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const shouldUseParentPlaylist = Boolean(playlistItems);
  const {
    data,
    error: playlistError,
    isError: isPlaylistError,
    isFetching,
    isLoading,
    refetch,
  } = usePlaylist(roomId, isReady && !shouldUseParentPlaylist, playlistApiClient);
  const addPlaylistItem = useAddPlaylistItem(roomId, playlistApiClient);
  const deletePlaylistItem = useDeletePlaylistItem(roomId, playlistApiClient);
  const reorderPlaylist = useReorderPlaylist(roomId, playlistApiClient);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
  const visiblePlaylist = playlistItems ?? playlist;
  const isInitialLoading = isLoading && visiblePlaylist.length === 0;
  const isBackgroundFetching = isFetching && !isLoading && visiblePlaylist.length > 0;
  const mutationError = addPlaylistItem.error ?? deletePlaylistItem.error ?? reorderPlaylist.error;
  const mutationErrorMessage = mutationError ? getPlaylistErrorMessage(mutationError) : undefined;

  const resetMutationErrors = () => {
    addPlaylistItem.reset();
    deletePlaylistItem.reset();
    reorderPlaylist.reset();
  };

  const setActiveDraggingItemId = (itemId: string | null) => {
    draggingItemIdRef.current = itemId;
    setDraggingItemId(itemId);
  };

  const preventMouseFocus = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') {
      event.preventDefault();
    }
  };

  const handleRowBlur = (event: React.FocusEvent<HTMLDivElement>, itemId: string) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setFocusedActionItemId((currentItemId) => (currentItemId === itemId ? null : currentItemId));
  };

  const handleToggleAddForm = () => {
    resetMutationErrors();
    setIsAddFormOpen((value) => !value);
  };

  const handleOpenAddForm = () => {
    resetMutationErrors();
    setIsAddFormOpen(true);
  };

  const handleRetry = () => {
    resetMutationErrors();
    void refetch();
  };

  useEffect(() => {
    if (!shouldUseParentPlaylist && data?.playlist) {
      setPlaylist(data.playlist);
    }
  }, [data?.playlist, setPlaylist, shouldUseParentPlaylist]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUrl = youtubeUrl.trim();
    if (!isReady || !trimmedUrl || addPlaylistItem.isPending) {
      return;
    }

    resetMutationErrors();
    addPlaylistItem.mutate(
      { youtubeUrl: trimmedUrl },
      {
        onSuccess: () => {
          setYoutubeUrl('');
        },
      },
    );
  };

  const handleDrop = (targetItemId: string) => {
    const currentDraggingItemId = draggingItemIdRef.current;

    if (!isReady || !isHost || !currentDraggingItemId || currentDraggingItemId === targetItemId) {
      setActiveDraggingItemId(null);
      return;
    }

    const currentIndex = visiblePlaylist.findIndex((item) => item.id === currentDraggingItemId);
    const nextIndex = visiblePlaylist.findIndex((item) => item.id === targetItemId);

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= visiblePlaylist.length) {
      setActiveDraggingItemId(null);
      return;
    }

    const nextPlaylist = [...visiblePlaylist];
    const [targetItem] = nextPlaylist.splice(currentIndex, 1);

    if (!targetItem) {
      setActiveDraggingItemId(null);
      return;
    }

    nextPlaylist.splice(nextIndex, 0, targetItem);
    resetMutationErrors();
    setActiveDraggingItemId(null);
    reorderPlaylist.mutate({
      items: nextPlaylist.map((item, index) => ({
        id: item.id,
        position: index + 1,
      })),
    });
  };

  const handleKeyboardReorder = (itemId: string, direction: -1 | 1) => {
    if (!isReady || !isHost) {
      return;
    }

    const currentIndex = visiblePlaylist.findIndex((item) => item.id === itemId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= visiblePlaylist.length) {
      return;
    }

    const nextPlaylist = [...visiblePlaylist];
    const [targetItem] = nextPlaylist.splice(currentIndex, 1);

    if (!targetItem) {
      return;
    }

    nextPlaylist.splice(nextIndex, 0, targetItem);
    resetMutationErrors();
    reorderPlaylist.mutate({
      items: nextPlaylist.map((item, index) => ({
        id: item.id,
        position: index + 1,
      })),
    });
  };

  const handleDragHandlePointerDown = (
    itemId: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!isReady || !isHost) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setActiveDraggingItemId(itemId);
  };

  const handleDragHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingItemIdRef.current) {
      return;
    }

    event.preventDefault();
  };

  const handleDragHandlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingItemIdRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    const targetRow = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-playlist-item-id]');
    const targetItemId = targetRow?.dataset.playlistItemId;

    if (!targetItemId) {
      setActiveDraggingItemId(null);
      return;
    }

    handleDrop(targetItemId);
  };

  const handleDelete = (itemId: string) => {
    resetMutationErrors();
    deletePlaylistItem.mutate(itemId);
  };

  return (
    <aside className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      <PlaylistPanelHeader
        isBackgroundFetching={isBackgroundFetching}
        itemCount={visiblePlaylist.length}
        onAddClick={handleToggleAddForm}
      />

      {isAddFormOpen ? (
        <PlaylistAddForm
          errorMessage={addPlaylistItem.isError ? mutationErrorMessage : undefined}
          isPending={addPlaylistItem.isPending}
          isReady={isReady}
          onSubmit={handleSubmit}
          onYoutubeUrlChange={setYoutubeUrl}
          youtubeUrl={youtubeUrl}
        />
      ) : null}

      {mutationErrorMessage && !addPlaylistItem.isError ? (
        <PlaylistMutationError message={mutationErrorMessage} />
      ) : null}

      <div className="min-w-0 flex-1 overflow-y-auto">
        {isInitialLoading ? <PlaylistLoadingState /> : null}
        {isPlaylistError ? (
          <PlaylistErrorState
            errorMessage={getPlaylistErrorMessage(playlistError)}
            onRetry={handleRetry}
          />
        ) : null}
        {!isInitialLoading && !isPlaylistError && visiblePlaylist.length === 0 ? (
          <PlaylistEmptyState isReady={isReady} onAddClick={handleOpenAddForm} />
        ) : null}
        {visiblePlaylist.map((item, index) => {
          const isCurrent = index === 0;

          return (
            <PlaylistItemRow
              key={item.id}
              isCurrent={isCurrent}
              isDeletePending={deletePlaylistItem.isPending}
              isDragging={draggingItemId === item.id}
              isFocused={focusedActionItemId === item.id}
              isHost={isHost}
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
        onClick={handleToggleAddForm}
      >
        <Plus className="h-4 w-4" aria-hidden />곡 추가
      </Button>
    </aside>
  );
}

function getPlaylistErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === 'PLAYLIST_INVALID_URL') {
      return '유효한 YouTube 링크를 입력해주세요.';
    }

    if (error.code === 'PLAYLIST_VIDEO_UNAVAILABLE') {
      return '재생할 수 없는 영상이에요.';
    }

    if (error.code === 'AUTH_FORBIDDEN') {
      return '이 작업을 할 권한이 없어요.';
    }

    if (error.code === 'PLAYLIST_ITEM_NOT_FOUND') {
      return '이미 삭제됐거나 찾을 수 없는 곡이에요.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.';
    }

    return error.message;
  }

  return '잠시 후 다시 시도해주세요.';
}
