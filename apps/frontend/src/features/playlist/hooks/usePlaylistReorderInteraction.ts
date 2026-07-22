'use client';

// Playlist 행의 포인터·키보드 순서 변경과 액션 포커스를 관리한다.
import { useRef, useState } from 'react';

import type { PlaylistItem } from '@/shared/types/domain';

import type { ReorderPlaylistRequest } from '../types/playlistTypes';

// 순서 계산에는 item.id만 필요하므로, addedBy 유무와 무관하게 Room·개인 아이템을 모두 받는다.
type ReorderablePlaylistItem = Pick<PlaylistItem, 'id'>;

interface UsePlaylistReorderInteractionParams {
  canControlRoom: boolean;
  isReady: boolean;
  onBeforeReorder: () => void;
  onReorder: (body: ReorderPlaylistRequest) => void;
  playlist: ReorderablePlaylistItem[];
}

export function usePlaylistReorderInteraction({
  canControlRoom,
  isReady,
  onBeforeReorder,
  onReorder,
  playlist,
}: UsePlaylistReorderInteractionParams) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const draggingItemIdRef = useRef<string | null>(null);
  const [focusedActionItemId, setFocusedActionItemId] = useState<string | null>(null);

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

  const submitReorder = (nextPlaylist: ReorderablePlaylistItem[]) => {
    onBeforeReorder();
    onReorder({
      // 백엔드 규약: position은 1부터 항목 수까지 중복 없이 연속이어야 한다. (Room·개인 공통)
      items: nextPlaylist.map((item, index) => ({
        id: item.id,
        position: index + 1,
      })),
    });
  };

  const handleDrop = (targetItemId: string) => {
    const currentDraggingItemId = draggingItemIdRef.current;

    if (
      !isReady ||
      !canControlRoom ||
      !currentDraggingItemId ||
      currentDraggingItemId === targetItemId
    ) {
      setActiveDraggingItemId(null);
      return;
    }

    const currentIndex = playlist.findIndex((item) => item.id === currentDraggingItemId);
    const nextIndex = playlist.findIndex((item) => item.id === targetItemId);

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= playlist.length) {
      setActiveDraggingItemId(null);
      return;
    }

    const nextPlaylist = [...playlist];
    const [targetItem] = nextPlaylist.splice(currentIndex, 1);

    if (!targetItem) {
      setActiveDraggingItemId(null);
      return;
    }

    nextPlaylist.splice(nextIndex, 0, targetItem);
    setActiveDraggingItemId(null);
    submitReorder(nextPlaylist);
  };

  const handleKeyboardReorder = (itemId: string, direction: -1 | 1) => {
    if (!isReady || !canControlRoom) {
      return;
    }

    const currentIndex = playlist.findIndex((item) => item.id === itemId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= playlist.length) {
      return;
    }

    const nextPlaylist = [...playlist];
    const [targetItem] = nextPlaylist.splice(currentIndex, 1);

    if (!targetItem) {
      return;
    }

    nextPlaylist.splice(nextIndex, 0, targetItem);
    submitReorder(nextPlaylist);
  };

  const handleDragHandlePointerDown = (
    itemId: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!isReady || !canControlRoom) {
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

  return {
    draggingItemId,
    focusedActionItemId,
    handleDragHandlePointerDown,
    handleDragHandlePointerMove,
    handleDragHandlePointerUp,
    handleDrop,
    handleKeyboardReorder,
    handleRowBlur,
    preventMouseFocus,
    setActiveDraggingItemId,
    setFocusedActionItemId,
  };
}
