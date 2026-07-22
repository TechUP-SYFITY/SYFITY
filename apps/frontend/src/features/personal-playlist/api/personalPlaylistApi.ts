// 나만의 Playlist CRUD·정렬·곡 추가/삭제와 Room 불러오기 REST API를 담당한다.
import { apiClient } from '@/shared/lib/api/apiClient';
import type { PlaylistItem } from '@/shared/types/domain';

import type {
  AddPersonalPlaylistItemRequest,
  CreatePersonalPlaylistRequest,
  CreatePersonalPlaylistResponse,
  ImportPlaylistToRoomRequest,
  ImportPlaylistToRoomResult,
  PersonalPlaylistDetail,
  PersonalPlaylistListResponse,
  ReorderPersonalPlaylistRequest,
  ReorderPersonalPlaylistResponse,
  UpdatePersonalPlaylistRequest,
  UpdatePersonalPlaylistResponse,
} from '../types/personalPlaylistTypes';

export const personalPlaylistApi = {
  getPlaylists: () => apiClient.get<PersonalPlaylistListResponse>('/personal-playlists'),
  getPlaylist: (id: string) => apiClient.get<PersonalPlaylistDetail>(`/personal-playlists/${id}`),
  createPlaylist: (body: CreatePersonalPlaylistRequest) =>
    apiClient.post<CreatePersonalPlaylistResponse>('/personal-playlists', body),
  updatePlaylist: (id: string, body: UpdatePersonalPlaylistRequest) =>
    apiClient.patch<UpdatePersonalPlaylistResponse>(`/personal-playlists/${id}`, body),
  deletePlaylist: (id: string) => apiClient.delete<void>(`/personal-playlists/${id}`),
  addItem: (id: string, body: AddPersonalPlaylistItemRequest) =>
    apiClient.post<PlaylistItem>(`/personal-playlists/${id}/items`, body),
  deleteItem: (id: string, itemId: string) =>
    apiClient.delete<void>(`/personal-playlists/${id}/items/${itemId}`),
  reorder: (id: string, body: ReorderPersonalPlaylistRequest) =>
    apiClient.patch<ReorderPersonalPlaylistResponse>(`/personal-playlists/${id}/items`, body),
  importToRoom: (roomId: string, body: ImportPlaylistToRoomRequest) =>
    apiClient.post<ImportPlaylistToRoomResult>(`/rooms/${roomId}/playlist-imports`, body),
};

export type PersonalPlaylistApi = typeof personalPlaylistApi;
