// Playlist 조회, 추가, 삭제, 순서 변경 REST API를 담당한다.
import { apiClient } from '@/shared/lib/api/apiClient';

import type {
  AddPlaylistItemRequest,
  AddPlaylistItemResponse,
  PlaylistResponse,
  ReorderPlaylistRequest,
} from '../types/playlistTypes';

export const playlistApi = {
  addPlaylistItem: (roomId: string, body: AddPlaylistItemRequest) =>
    apiClient.post<AddPlaylistItemResponse>(`/rooms/${roomId}/playlist`, body),
  deletePlaylistItem: (roomId: string, itemId: string) =>
    apiClient.delete<{ message: string }>(`/rooms/${roomId}/playlist/${itemId}`),
  getPlaylist: (roomId: string) => apiClient.get<PlaylistResponse>(`/rooms/${roomId}/playlist`),
  reorderPlaylist: (roomId: string, body: ReorderPlaylistRequest) =>
    apiClient.patch<{ message: string }>(`/rooms/${roomId}/playlist/reorder`, body),
};

export type PlaylistApi = typeof playlistApi;
