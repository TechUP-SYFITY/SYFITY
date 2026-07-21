'use client';

import { ArrowLeft, CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Button } from '@/shared/components/ui/Button';
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconBadge,
  DialogTitle,
} from '@/shared/components/ui/Dialog';
import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';

import { CreatePlaylistDialog } from '@/features/personal-playlist/components/CreatePlaylistDialog';
import {
  useAddPlaylistItem,
  useDeletePlaylist,
  useDeletePlaylistItem,
  useMyPlaylist,
  useReorderPlaylist,
} from '@/features/personal-playlist/hooks/personalPlaylistHooks';
import { formatPlaylistLength } from '@/features/personal-playlist/lib/formatPlaylistLength';
import { PlaylistItemRow } from '@/features/playlist/components/PlaylistItemRow';
import { usePlaylistReorderInteraction } from '@/features/playlist/hooks/usePlaylistReorderInteraction';
import type { YoutubeSearchResult } from '@/features/search/api/searchApi';
import {
  SearchAddToast,
  type SearchAddToastFeedback,
} from '@/features/search/components/SearchAddToast';
import { SearchPanel } from '@/features/search/components/SearchPanel';

interface PersonalPlaylistDetailProps {
  playlistId: string;
}

export function PersonalPlaylistDetail({ playlistId }: PersonalPlaylistDetailProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useMyPlaylist(playlistId);

  const addItem = useAddPlaylistItem(playlistId);
  const deleteItem = useDeletePlaylistItem(playlistId);
  const reorder = useReorderPlaylist(playlistId);
  const deletePlaylist = useDeletePlaylist();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<SearchAddToastFeedback | null>(null);
  const toastIdRef = useRef(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const items = data?.items ?? [];

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
    canControlRoom: true,
    isReady: true,
    onBeforeReorder: () => reorder.reset(),
    onReorder: reorder.mutate,
    playlist: items,
  });

  const showAddToast = (variant: SearchAddToastFeedback['variant'], message: string) => {
    toastIdRef.current += 1;
    setToastFeedback({ id: toastIdRef.current, message, variant });
  };

  const handleOpenSearch = () => {
    addItem.reset();
    setToastFeedback(null);
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    addItem.reset();
    setToastFeedback(null);
    setIsSearchOpen(false);
  };

  const addPlaylistItem = (body: { videoId?: string; youtubeUrl?: string }) => {
    setToastFeedback(null);
    addItem.reset();
    addItem.mutate(body, {
      onError: (error) => showAddToast('error', getApiErrorMessage(error)),
      onSuccess: () => showAddToast('success', '플레이리스트에 추가했어요 🎵'),
    });
  };

  const handleDeletePlaylist = () => {
    deletePlaylist.mutate(playlistId, {
      onSuccess: () => router.push('/playlists'),
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-205 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex animate-pulse flex-col gap-2">
          <div className="h-3 w-16 rounded-sm bg-white/8" />
          <div className="h-6 w-2/5 rounded-sm bg-white/8" />
          <div className="h-3 w-1/4 rounded-sm bg-white/5" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-205 flex-col items-center gap-3 px-4 py-16 text-center">
        <CircleAlert className="size-8 text-destructive" aria-hidden />
        <p className="text-sm text-white/70">플레이리스트를 불러오지 못했어요</p>
        <Button variant="ghost" size="sm" onClick={() => router.push('/playlists')}>
          목록으로
        </Button>
      </div>
    );
  }

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={() => router.push('/playlists')}
        className="-mb-2 flex w-fit items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden />내 플레이리스트
      </button>

      <header className="flex items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            플레이리스트
          </span>
          <h1 className="truncate text-2xl font-bold text-white">{data.name}</h1>
          <span className="text-xs text-white/55">
            {items.length}곡{totalDuration > 0 ? ` · ${formatPlaylistLength(totalDuration)}` : ''}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="primary-soft"
            size="sm"
            className="rounded-2xl"
            onClick={handleOpenSearch}
          >
            <Plus className="size-4" aria-hidden />곡 추가
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="플레이리스트 수정"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="플레이리스트 삭제"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={handleOpenSearch}
          className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-white/12 p-4 text-left text-white/40 transition-colors hover:border-primary/30 hover:bg-white/2 hover:text-white/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-primary">
            <Plus className="size-5" aria-hidden />
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-white">곡 추가</span>
            <span className="text-xs text-white/40">
              검색하거나 YouTube 링크로 첫 곡을 추가해보세요
            </span>
          </span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {items.map((item) => (
            <PlaylistItemRow
              key={item.id}
              isCurrent={false}
              isDeleteEnabled
              isDeletePending={deleteItem.isPending}
              isDragging={draggingItemId === item.id}
              isFocused={focusedActionItemId === item.id}
              isHost
              isOwnItem
              isReady
              isReorderEnabled
              item={item}
              onBlurWithin={(event) => handleRowBlur(event, item.id)}
              onDelete={(itemId) => deleteItem.mutate(itemId)}
              onDragHandlePointerCancel={() => setActiveDraggingItemId(null)}
              onDragHandleKeyDown={handleKeyboardReorder}
              onDragHandlePointerDown={handleDragHandlePointerDown}
              onDragHandlePointerMove={handleDragHandlePointerMove}
              onDragHandlePointerUp={handleDragHandlePointerUp}
              onFocusWithin={() => setFocusedActionItemId(item.id)}
              onPreventMouseFocus={preventMouseFocus}
            />
          ))}
        </div>
      )}

      <CreatePlaylistDialog open={isEditOpen} onOpenChange={setIsEditOpen} playlist={data} />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-105">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <DialogIconBadge>
                <Trash2 className="inline-block shrink-0" aria-hidden />
              </DialogIconBadge>
              <DialogTitle>플레이리스트 삭제</DialogTitle>
            </div>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              &lsquo;{data.name}&rsquo; 플레이리스트를 삭제할까요? 이 작업은 되돌릴 수 없어요.
            </DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full sm:flex-1"
              onClick={() => setIsDeleteOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full sm:flex-1"
              isLoading={deletePlaylist.isPending}
              onClick={handleDeletePlaylist}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SearchPanel
        feedback={
          <SearchAddToast feedback={toastFeedback} onClose={() => setToastFeedback(null)} />
        }
        isAddPending={addItem.isPending}
        isOpen={isSearchOpen}
        roomName={data.name}
        onAddResult={(result: YoutubeSearchResult) => addPlaylistItem({ videoId: result.videoId })}
        onAddUrl={(youtubeUrl: string) => addPlaylistItem({ youtubeUrl })}
        onClose={handleCloseSearch}
      />
    </div>
  );
}
