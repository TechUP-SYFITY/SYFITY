// Room 개발 preview에서 Playlist API 호출을 로컬 응답으로 대체한다.
import type { PlaylistItem } from '@/shared/types/domain';

import { ROOM_PREVIEW_PLAYLIST, ROOM_PREVIEW_ROOM } from './roomPreviewData';

interface PreviewAddPlaylistItemRequest {
  videoId?: string;
  youtubeUrl?: string;
}

interface PreviewReorderPlaylistRequest {
  items: Array<{ id: string; position: number }>;
}

interface RoomPreviewPlaylistApi {
  addPlaylistItem: (roomId: string, body: PreviewAddPlaylistItemRequest) => Promise<PlaylistItem>;
  deletePlaylistItem: (roomId: string, itemId: string) => Promise<{ message: string }>;
  getPlaylist: (roomId: string) => Promise<{ playlist: PlaylistItem[] }>;
  reorderPlaylist: (
    roomId: string,
    body: PreviewReorderPlaylistRequest,
  ) => Promise<{ message: string }>;
}

export const roomPreviewPlaylistApi: RoomPreviewPlaylistApi = {
  addPlaylistItem: async (_roomId, body) => ({
    addedBy: ROOM_PREVIEW_ROOM.hostId,
    channelTitle: 'Preview',
    duration: 180,
    id: `preview-${body.videoId ?? body.youtubeUrl ?? 'track'}`,
    position: ROOM_PREVIEW_PLAYLIST.length + 1,
    status: 'available',
    thumbnailUrl: '',
    title: body.youtubeUrl ?? body.videoId ?? 'Preview Track',
    videoId: body.videoId ?? 'preview-video',
  }),
  deletePlaylistItem: async () => ({ message: 'preview playlist item deleted' }),
  getPlaylist: async () => ({ playlist: ROOM_PREVIEW_PLAYLIST }),
  reorderPlaylist: async () => ({ message: 'preview playlist reordered' }),
};
