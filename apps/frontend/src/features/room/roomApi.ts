// Room 생성, 입장, 조회 REST API를 담당한다.
import { apiClient } from '@/shared/lib/api/apiClient';

import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RecentRoomsResponse,
  RoomResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
} from './roomTypes';

export const roomApi = {
  closeRoom: (roomId: string) => apiClient.post<{ message: string }>(`/rooms/${roomId}/close`),
  createRoom: (body: CreateRoomRequest) => apiClient.post<CreateRoomResponse>('/rooms', body),
  getRecentRooms: () => apiClient.get<RecentRoomsResponse>('/rooms/recent'),
  getRoom: (roomId: string) => apiClient.get<RoomResponse>(`/rooms/${roomId}`),
  joinRoom: (body: JoinRoomRequest) => apiClient.post<JoinRoomResponse>('/rooms/join', body),
  updateRoom: (roomId: string, body: UpdateRoomRequest) =>
    apiClient.patch<UpdateRoomResponse>(`/rooms/${roomId}`, body),
};

export type RoomApi = typeof roomApi;
