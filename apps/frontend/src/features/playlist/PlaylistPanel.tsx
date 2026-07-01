'use client';

// Playlist 목록과 곡 추가, 삭제, 재생 요청을 위한 최소 UI를 제공한다.
import { useEffect, useState } from 'react';

import type { PlaylistItem } from '@/shared/types/domain';

import {
  useAddPlaylistItem,
  useDeletePlaylistItem,
  usePlaylist,
  useReorderPlaylist,
} from './playlistHooks';
import { usePlaylistStore } from './playlistStore';

interface PlaylistPanelProps {
  fallbackPlaylist?: PlaylistItem[];
  roomId: string;
  isHost: boolean;
  isReady: boolean;
  onPlayItem: (playlistItemId: string) => void;
}

const ROOM_ICON_PATHS = {
  chevronDown: '/assets/icons/room/chevron-down.svg',
  emptyInbox: '/assets/icons/room/empty-inbox.svg',
  play: '/assets/icons/room/play.svg',
  playlist: '/assets/icons/room/playlist.svg',
  plus: '/assets/icons/room/plus.svg',
  plusPrimary: '/assets/icons/room/plus-primary.svg',
  trash: '/assets/icons/room/trash.svg',
  unavailable: '/assets/icons/room/unavailable.svg',
} as const;

type RoomIconName = keyof typeof ROOM_ICON_PATHS;

export function PlaylistPanel({
  fallbackPlaylist = [],
  roomId,
  isHost,
  isReady,
  onPlayItem,
}: PlaylistPanelProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const { data, isLoading } = usePlaylist(roomId, isReady);
  const addPlaylistItem = useAddPlaylistItem(roomId);
  const deletePlaylistItem = useDeletePlaylistItem(roomId);
  const reorderPlaylist = useReorderPlaylist(roomId);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
  const visiblePlaylist = playlist.length > 0 ? playlist : (data?.playlist ?? fallbackPlaylist);

  useEffect(() => {
    if (data?.playlist) {
      setPlaylist(data.playlist);
    }
  }, [data?.playlist, setPlaylist]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUrl = youtubeUrl.trim();
    if (!isReady || !trimmedUrl) {
      return;
    }

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
    reorderPlaylist.mutate({
      items: nextPlaylist.map((item, index) => ({
        id: item.id,
        position: index + 1,
      })),
    });
  };

  return (
    <aside className="relative flex min-h-[360px] flex-col border-r border-white/[0.07] bg-[#09090b]">
      <div className="hidden h-12 items-center justify-between border-b border-white/[0.07] px-4 lg:flex">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-white/65">
          <RoomIcon name="playlist" className="h-3.5 w-3.5 text-[#72f4a4]" />
          재생목록
          <span className="font-normal text-white/35">{visiblePlaylist.length}곡</span>
        </h2>
        <button
          className="flex items-center gap-1.5 rounded-2xl border border-[#72f4a4]/20 bg-[#72f4a4]/10 px-3 py-2 text-xs font-bold text-[#72f4a4]"
          type="button"
          onClick={() => setIsAddFormOpen((value) => !value)}
        >
          <RoomIcon name="plus" className="h-3 w-3" />
          추가
        </button>
      </div>

      {isAddFormOpen ? (
        <form className="flex gap-2 border-b border-white/[0.07] px-4 py-3" onSubmit={handleSubmit}>
          <input
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white outline-none placeholder:text-white/28 focus:border-[#72f4a4]/60"
            placeholder="YouTube URL"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
          />
          <button
            className="flex items-center gap-1.5 rounded-xl bg-[#72f4a4] px-3 py-2 text-sm font-bold text-[#07150d] disabled:opacity-50"
            disabled={!isReady || addPlaylistItem.isPending}
            type="submit"
          >
            <RoomIcon name="plus" className="h-3.5 w-3.5" />
            추가
          </button>
        </form>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? <p className="p-4 text-sm text-white/40">Playlist 불러오는 중</p> : null}
        {!isLoading && visiblePlaylist.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-white/40">
              <RoomIcon name="emptyInbox" className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-white">아직 곡이 없어요</p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              검색하거나 링크로 곡을 추가해보세요.
            </p>
            <button
              className="mt-6 flex items-center gap-2 rounded-2xl bg-[#72f4a4] px-4 py-3 text-sm font-bold text-[#09090b] shadow-[0_0_24px_rgba(114,244,164,0.24)] disabled:opacity-50"
              disabled={!isReady}
              type="button"
              onClick={() => setIsAddFormOpen(true)}
            >
              <RoomIcon name="plusPrimary" className="h-4 w-4" />첫 번째 곡 추가
            </button>
          </div>
        ) : null}
        {visiblePlaylist.map((item, index) => {
          const isCurrent = index === 0;
          const isUnavailable = item.status === 'unavailable';
          const titleColorClass = isCurrent
            ? 'text-[#72f4a4]'
            : getUnavailableAwareTextClass(isUnavailable);

          return (
            <div
              className={`group border-b border-white/[0.055] px-4 py-3 transition ${
                isCurrent ? 'bg-[#72f4a4]/[0.035]' : 'hover:bg-white/[0.025]'
              }`}
              key={item.id}
            >
              <div className="flex min-h-10 items-center gap-3">
                <TrackArtwork item={item} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${titleColorClass}`}>
                    {item.title}
                    {isUnavailable ? (
                      <RoomIcon
                        name="unavailable"
                        className="ml-1 inline-block h-3 w-3 text-[#f87171]"
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
                <button
                  className={
                    isHost
                      ? 'hidden h-7 w-7 items-center justify-center rounded-full text-white/40 opacity-0 transition group-hover:opacity-100 disabled:opacity-0 lg:flex'
                      : 'hidden'
                  }
                  disabled={!isReady || !isHost || isUnavailable}
                  type="button"
                  aria-label={`${item.title} 재생`}
                  onClick={() => onPlayItem(item.id)}
                >
                  <RoomIcon name="play" className="h-3.5 w-3.5" />
                </button>
                <div
                  className={
                    isHost
                      ? 'hidden items-center gap-2 opacity-0 transition group-hover:opacity-100 lg:flex'
                      : 'hidden'
                  }
                >
                  <button
                    className="flex h-5 w-5 items-center justify-center text-white/32 disabled:opacity-20"
                    disabled={!isReady || !isHost || isCurrent}
                    type="button"
                    onClick={() => handleMove(item.id, -1)}
                    aria-label={`${item.title} 위로 이동`}
                  >
                    <RoomIcon name="chevronDown" className="h-3 w-3 rotate-180" />
                  </button>
                  <button
                    className="flex h-5 w-5 items-center justify-center text-white/32 disabled:opacity-20"
                    disabled={!isReady || !isHost || index === visiblePlaylist.length - 1}
                    type="button"
                    onClick={() => handleMove(item.id, 1)}
                    aria-label={`${item.title} 아래로 이동`}
                  >
                    <RoomIcon name="chevronDown" className="h-3 w-3" />
                  </button>
                  <button
                    className="flex h-5 w-5 items-center justify-center text-rose-400/70 disabled:opacity-20"
                    disabled={!isReady || deletePlaylistItem.isPending}
                    type="button"
                    aria-label={`${item.title} 삭제`}
                    onClick={() => deletePlaylistItem.mutate(item.id)}
                  >
                    <RoomIcon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="fixed right-5 bottom-24 z-30 flex items-center gap-2 rounded-2xl bg-[#72f4a4] px-5 py-3 text-sm font-bold text-[#07150d] shadow-[0_0_28px_rgba(114,244,164,0.45)] lg:hidden"
        type="button"
        onClick={() => setIsAddFormOpen((value) => !value)}
      >
        <RoomIcon name="plusPrimary" className="h-4 w-4" />곡 추가
      </button>
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

function RoomIcon({ className = '', name }: { className?: string; name: RoomIconName }) {
  return (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{
        WebkitMask: `url(${ROOM_ICON_PATHS[name]}) center / contain no-repeat`,
        backgroundColor: 'currentColor',
        mask: `url(${ROOM_ICON_PATHS[name]}) center / contain no-repeat`,
      }}
      aria-hidden
    />
  );
}
