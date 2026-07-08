'use client';

// Playlist 목록과 곡 추가, 삭제, 재생 요청을 위한 최소 UI를 제공한다.
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Inbox,
  ListMusic,
  Loader2,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button, Input } from '@/shared/components/ui';
import { ApiClientError } from '@/shared/types/api';
import type { PlaylistItem } from '@/shared/types/domain';

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
  onPlayItem: (playlistItemId: string) => void;
  playlistApiClient?: PlaylistApi;
}

export function PlaylistPanel({
  playlistItems,
  roomId,
  isHost,
  isReady,
  onPlayItem,
  playlistApiClient,
}: PlaylistPanelProps) {
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

  const handleMove = (itemId: string, direction: -1 | 1) => {
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

  return (
    <aside className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-background">
      <div className="hidden h-12 items-center justify-between border-b border-border px-4 xl:flex">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-white/65">
          <ListMusic className="h-3.5 w-3.5 text-primary" aria-hidden />
          재생목록
          <span className="font-normal text-white/35">{visiblePlaylist.length}곡</span>
          {isBackgroundFetching ? (
            <span className="font-normal text-white/35" aria-live="polite">
              새로고침 중
            </span>
          ) : null}
        </h2>
        <Button
          variant="primary-soft"
          size="sm"
          className="rounded-2xl"
          type="button"
          onClick={() => {
            resetMutationErrors();
            setIsAddFormOpen((value) => !value);
          }}
        >
          <Plus className="h-3 w-3" aria-hidden />
          추가
        </Button>
      </div>

      {isAddFormOpen ? (
        <form className="flex gap-2 border-b border-border px-4 py-3" onSubmit={handleSubmit}>
          <Input
            className="min-w-0 rounded-xl border-border bg-input"
            error={addPlaylistItem.isError ? mutationErrorMessage : undefined}
            leadingIcon={<ListMusic aria-hidden />}
            placeholder="YouTube URL"
            value={youtubeUrl}
            disabled={!isReady || addPlaylistItem.isPending}
            onChange={(event) => setYoutubeUrl(event.target.value)}
          />
          <Button
            className="h-11 shrink-0 rounded-xl"
            disabled={!isReady || addPlaylistItem.isPending}
            isLoading={addPlaylistItem.isPending}
            type="submit"
          >
            {!addPlaylistItem.isPending ? <Plus className="h-3.5 w-3.5" aria-hidden /> : null}
            추가
          </Button>
        </form>
      ) : null}

      {mutationErrorMessage && !addPlaylistItem.isError ? (
        <p className="border-b border-border px-4 py-2 text-xs text-destructive" role="alert">
          {mutationErrorMessage}
        </p>
      ) : null}

      <div className="min-w-0 flex-1 overflow-y-auto">
        {isInitialLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-white/45" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Playlist 불러오는 중
          </div>
        ) : null}
        {isPlaylistError ? (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
              <CircleAlert className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-bold text-white">재생목록을 불러오지 못했어요</p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              {getPlaylistErrorMessage(playlistError)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-5 rounded-2xl"
              type="button"
              onClick={() => void refetch()}
            >
              다시 시도
            </Button>
          </div>
        ) : null}
        {!isInitialLoading && !isPlaylistError && visiblePlaylist.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-input text-white/40">
              <Inbox className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-bold text-white">아직 곡이 없어요</p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              검색하거나 링크로 곡을 추가해보세요.
            </p>
            <Button
              className="mt-6 rounded-2xl"
              disabled={!isReady}
              type="button"
              onClick={() => {
                resetMutationErrors();
                setIsAddFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />첫 번째 곡 추가
            </Button>
          </div>
        ) : null}
        {visiblePlaylist.map((item, index) => {
          const isCurrent = index === 0;
          const isUnavailable = item.status === 'unavailable';
          const actionVisibilityClass =
            focusedActionItemId === item.id
              ? 'xl:opacity-100'
              : 'xl:opacity-0 xl:group-hover:opacity-100';
          const titleColorClass = isCurrent
            ? 'text-primary'
            : getUnavailableAwareTextClass(isUnavailable);

          return (
            <div
              className={`group min-w-0 overflow-hidden border-b border-border px-4 py-3 transition ${
                isCurrent ? 'bg-primary/5' : 'hover:bg-muted/20'
              }`}
              key={item.id}
              onBlurCapture={(event) => handleRowBlur(event, item.id)}
              onFocusCapture={() => setFocusedActionItemId(item.id)}
            >
              <div className="flex min-h-10 min-w-0 items-center gap-3">
                <TrackArtwork item={item} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${titleColorClass}`}>
                    {item.title}
                    {isUnavailable ? (
                      <CircleAlert
                        className="ml-1 inline-block h-3 w-3 text-destructive"
                        aria-hidden
                      />
                    ) : null}
                  </p>
                  <p
                    className={`mt-1 truncate text-xs ${
                      isUnavailable ? 'text-white/25' : 'text-white/42'
                    }`}
                  >
                    {item.channelTitle}
                    <span className="mx-1">·</span>
                    {formatDuration(item.duration)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={
                    isHost
                      ? `h-7 w-7 shrink-0 rounded-full border-0 bg-transparent text-white/40 opacity-100 hover:bg-white/5 ${actionVisibilityClass}`
                      : 'hidden'
                  }
                  disabled={!isReady || !isHost || isUnavailable}
                  type="button"
                  aria-label={`${item.title} 재생`}
                  onPointerDown={preventMouseFocus}
                  onClick={() => onPlayItem(item.id)}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <div
                  className={
                    isHost
                      ? `flex shrink-0 items-center gap-1 opacity-100 transition ${actionVisibilityClass}`
                      : 'hidden'
                  }
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full border-0 bg-transparent text-white/35 hover:bg-white/5"
                    disabled={!isReady || !isHost || isCurrent}
                    type="button"
                    data-testid={`playlist-move-up-${item.id}`}
                    onPointerDown={preventMouseFocus}
                    onClick={() => handleMove(item.id, -1)}
                    aria-label={`${item.title} 위로 이동`}
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full border-0 bg-transparent text-white/35 hover:bg-white/5"
                    disabled={!isReady || !isHost || index === visiblePlaylist.length - 1}
                    type="button"
                    data-testid={`playlist-move-down-${item.id}`}
                    onPointerDown={preventMouseFocus}
                    onClick={() => handleMove(item.id, 1)}
                    aria-label={`${item.title} 아래로 이동`}
                  >
                    <ArrowDown className="h-3 w-3" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full border-0 bg-transparent text-destructive/70 hover:bg-destructive/10"
                    disabled={!isReady || deletePlaylistItem.isPending}
                    type="button"
                    aria-label={`${item.title} 삭제`}
                    onPointerDown={preventMouseFocus}
                    onClick={() => {
                      resetMutationErrors();
                      deletePlaylistItem.mutate(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="fixed right-5 bottom-24 z-30 rounded-2xl shadow-lg xl:hidden"
        type="button"
        onClick={() => {
          resetMutationErrors();
          setIsAddFormOpen((value) => !value);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />곡 추가
      </Button>
    </aside>
  );
}

function TrackArtwork({ item }: { item: PlaylistItem }) {
  return (
    <span
      className={`h-10 w-10 shrink-0 rounded-2xl bg-cover bg-center ${
        item.status === 'unavailable' ? 'opacity-45 grayscale' : ''
      }`}
      style={{ backgroundImage: `url(${getThumbnailUrl(item)})` }}
      role="img"
      aria-label={`${item.title} 썸네일`}
    />
  );
}

function getThumbnailUrl(item: PlaylistItem) {
  if (item.thumbnailUrl) {
    return item.thumbnailUrl;
  }

  return `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
}

function getUnavailableAwareTextClass(isUnavailable: boolean) {
  return isUnavailable ? 'text-white/42' : 'text-white';
}

function formatDuration(duration: number) {
  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
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
