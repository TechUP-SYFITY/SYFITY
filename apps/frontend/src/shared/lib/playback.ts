// Playback 상태와 playlist로 현재 재생 곡을 찾는 공통 유틸을 제공한다.
import type { PlaybackState, PlaylistItem } from '@/shared/types/domain';

export function getCurrentPlaylistItem(
  playlist: PlaylistItem[],
  playbackState: PlaybackState | null,
) {
  return playlist.find((item) => item.id === playbackState?.playlistItemId) ?? playlist[0];
}
