// 나만의 Playlist(개인 플레이리스트) REST 요청/응답 타입.
// 백엔드 정본(@syfity/shared)의 DTO를 그대로 재사용한다. (roomTypes.ts와 동일 패턴)
// apiClient가 { success, data } 봉투를 언랩하므로, 여기서는 data 페이로드 형태로 노출한다.
import type {
  CreatePersonalPlaylistResponse as CreatePersonalPlaylistResponseEnvelope,
  GetPersonalPlaylistResponse,
  GetPersonalPlaylistsResponse,
  ImportPersonalPlaylistRequest,
  ImportPersonalPlaylistResponse,
  PersonalPlaylist,
  ReorderPersonalPlaylistItemsRequest,
  ReorderPersonalPlaylistItemsResponse,
  UpdatePersonalPlaylistResponse as UpdatePersonalPlaylistResponseEnvelope,
} from '@syfity/shared';

// 백엔드 DTO를 그대로 재노출 (형태 동일)
export type {
  AddPersonalPlaylistItemRequest,
  CreatePersonalPlaylistRequest,
  PersonalPlaylist,
  PersonalPlaylistItem,
  ReorderPersonalPlaylistItem,
  UpdatePersonalPlaylistRequest,
} from '@syfity/shared';

// 목록/상세의 playlist 요약 = 백엔드 PersonalPlaylist ({ id, name, createdAt, updatedAt })
export type PersonalPlaylistSummary = PersonalPlaylist;

// GET /personal-playlists/{id} → { playlist, items }
export type PersonalPlaylistDetail = GetPersonalPlaylistResponse['data'];
// GET /personal-playlists → { playlists }
export type PersonalPlaylistListResponse = GetPersonalPlaylistsResponse['data'];

// POST/PATCH 응답 (언랩된 data)
export type CreatePersonalPlaylistResponse = CreatePersonalPlaylistResponseEnvelope['data'];
export type UpdatePersonalPlaylistResponse = UpdatePersonalPlaylistResponseEnvelope['data'];

// PATCH /personal-playlists/{id}/items (순서 변경)
export type ReorderPersonalPlaylistRequest = ReorderPersonalPlaylistItemsRequest;
export type ReorderPersonalPlaylistResponse = ReorderPersonalPlaylistItemsResponse['data'];

// POST /rooms/{roomId}/playlist-imports (Room으로 불러오기)
export type ImportPlaylistToRoomRequest = ImportPersonalPlaylistRequest;
export type ImportPlaylistToRoomResult = ImportPersonalPlaylistResponse['data'];
