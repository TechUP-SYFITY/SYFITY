// Room 생성, 입장, 조회 REST API를 담당한다.
import { apiClient } from '@/shared/lib/api/apiClient';

import type {
  CreateRoomRequest,
  CreateRoomResponse,
  CreateRoomMembershipRequest,
  CreateRoomMembershipResponse,
  MyRoomsResponse,
  RecentRoomsResponse,
  RoomResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
} from '../types/roomTypes';

export const roomApi = {
  createRoomMembership: (body: CreateRoomMembershipRequest) =>
    apiClient.post<CreateRoomMembershipResponse>('/room-memberships', body),
  createRoom: (body: CreateRoomRequest) => apiClient.post<CreateRoomResponse>('/rooms', body),
  getMyRooms: () => apiClient.get<MyRoomsResponse>('/rooms/mine'),
  getRecentRooms: () => apiClient.get<RecentRoomsResponse>('/rooms/recent'),
  getRoom: (roomId: string) => apiClient.get<RoomResponse>(`/rooms/${roomId}`),
  updateRoom: (roomId: string, body: UpdateRoomRequest) =>
    apiClient.patch<UpdateRoomResponse>(`/rooms/${roomId}`, body),
};

export type RoomApi = typeof roomApi;
