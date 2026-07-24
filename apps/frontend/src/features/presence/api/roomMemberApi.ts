import type {
  GetActiveRoomMembersResponse,
  GetKickedRoomMembersResponse,
  UpdateRoomMemberRequest,
  UpdateRoomMemberResponse,
} from '@syfity/shared';

import { apiClient } from '@/shared/lib/api/apiClient';

type ActiveMembersData = GetActiveRoomMembersResponse['data'];
type KickedMembersData = GetKickedRoomMembersResponse['data'];
type UpdateMemberData = UpdateRoomMemberResponse['data'];

export const roomMemberApi = {
  getActiveMembers: (roomId: string) =>
    apiClient.get<ActiveMembersData>(`/rooms/${roomId}/members`),
  getKickedMembers: (roomId: string) =>
    apiClient.get<KickedMembersData>(`/rooms/${roomId}/members?status=kicked`),
  updateMember: (roomId: string, memberId: string, body: UpdateRoomMemberRequest) =>
    apiClient.patch<UpdateMemberData>(`/rooms/${roomId}/members/${memberId}`, body),
};

export type RoomMemberApi = typeof roomMemberApi;
