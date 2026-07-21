// 나만의 Playlist(개인 플레이리스트) REST 요청/응답 타입을 정의한다.
// docs/05-api-spec.md 7절(개인 Playlist API)·6.5(불러오기)의 정식 스펙을 기준으로 한다.
import type { PlaylistItem } from '@/shared/types/domain';

export interface PersonalPlaylistSummary {
  id: string;
  name: string;
  description?: string | null;
  coverUrl?: string | null;
  itemCount: number;
  totalDuration: number; // 초 단위 총 재생시간
  updatedAt: string;
}

export interface PersonalPlaylistDetail extends PersonalPlaylistSummary {
  items: PlaylistItem[];
}

export interface PersonalPlaylistListResponse {
  playlists: PersonalPlaylistSummary[];
}

export interface CreatePersonalPlaylistRequest {
  name: string;
  description?: string;
  coverUrl?: string;
}

export type UpdatePersonalPlaylistRequest = Partial<CreatePersonalPlaylistRequest>;

export interface AddPersonalPlaylistItemRequest {
  videoId?: string;
  youtubeUrl?: string;
}

export interface ReorderPersonalPlaylistItem {
  id: string;
  position: number;
}

export interface ReorderPersonalPlaylistRequest {
  items: ReorderPersonalPlaylistItem[];
}

export interface ImportPlaylistToRoomRequest {
  personalPlaylistId: string;
}

// 불러오기 결과 집계 (docs/05 §6.5). 갱신된 Playlist는 소켓 playlist:updated로 전파되므로
// 응답 본문에는 건수만 담긴다.
export interface ImportPlaylistToRoomResult {
  addedCount: number;
  duplicateCount: number;
  unavailableCount: number;
}
