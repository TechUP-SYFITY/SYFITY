// Room 기능에서 REST 요청과 화면 상태가 공유하는 타입을 정의한다.
import type { JoinedRoomData, RoomDetail, RoomSummary } from '@/shared/types/domain';

export interface CreateRoomRequest {
  name: string;
}

export interface CreateRoomResponse {
  id: string;
  name: string;
  inviteCode: string;
  status: 'active';
  createdAt: string;
}

export interface JoinRoomRequest {
  inviteCode?: string;
  roomId?: string;
}

export interface RecentRoomsResponse {
  rooms: RoomSummary[];
}

export interface UpdateRoomRequest {
  name: string;
}

export interface UpdateRoomResponse {
  id: string;
  name: string;
  updatedAt: string;
}

export type JoinRoomResponse = JoinedRoomData;
export type RoomResponse = RoomDetail;
