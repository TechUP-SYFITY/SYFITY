// Playlist 기능에서 REST 요청과 실시간 목록 상태가 공유하는 타입을 정의한다.
import type { PlaylistItem } from '@/shared/types/domain';

export interface PlaylistResponse {
  playlist: PlaylistItem[];
}

export interface AddPlaylistItemRequest {
  videoId?: string;
  youtubeUrl?: string;
}

export interface ReorderPlaylistItem {
  id: string;
  position: number;
}

export interface ReorderPlaylistRequest {
  items: ReorderPlaylistItem[];
}

export type AddPlaylistItemResponse = PlaylistItem;
