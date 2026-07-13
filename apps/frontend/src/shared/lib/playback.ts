// Playback 상태와 playlist로 현재 재생 곡을 찾는 공통 유틸을 제공한다.
import type { PlaybackState, PlaylistItem } from '@/shared/types/domain';

export function getCurrentPlaylistItem(
  playlist: PlaylistItem[],
  playbackState: PlaybackState | null,
) {
  return (
    playlist.find((item) => item.id === playbackState?.playlistItemId) ??
    playlist.find((item) => item.status === 'available')
  );
}

export function getAdjacentPlayablePlaylistItems(
  playlist: PlaylistItem[],
  currentItem: PlaylistItem | undefined,
) {
  const currentIndex = currentItem ? playlist.findIndex((item) => item.id === currentItem.id) : -1;

  if (currentIndex < 0) {
    return { nextItem: undefined, previousItem: undefined };
  }

  const previousItem = playlist
    .slice(0, currentIndex)
    .reverse()
    .find((item) => item.status === 'available');
  const nextItem = playlist.slice(currentIndex + 1).find((item) => item.status === 'available');

  return { nextItem, previousItem };
}
