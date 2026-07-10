'use client';

// Room REST API를 TanStack Query 훅으로 연결한다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { roomApi, type RoomApi } from './roomApi';
import type { CreateRoomRequest, JoinRoomRequest, UpdateRoomRequest } from './roomTypes';

export const roomQueryKeys = {
  all: ['rooms'] as const,
  detail: (roomId: string) => [...roomQueryKeys.all, 'detail', roomId] as const,
  join: (roomId: string) => [...roomQueryKeys.all, 'join', roomId] as const,
  recent: () => [...roomQueryKeys.all, 'recent'] as const,
};

export const useRecentRooms = () =>
  useQuery({
    queryFn: roomApi.getRecentRooms,
    queryKey: roomQueryKeys.recent(),
  });

export const useRoom = (roomId: string) =>
  useQuery({
    enabled: roomId.length > 0,
    queryFn: () => roomApi.getRoom(roomId),
    queryKey: roomQueryKeys.detail(roomId),
  });

export const useCreateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRoomRequest) => roomApi.createRoom(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueryKeys.recent() }),
  });
};

export const useJoinRoom = (roomId: string) =>
  useQuery({
    enabled: roomId.length > 0,
    queryFn: async () => {
      const room = await roomApi.getRoom(roomId);

      return roomApi.joinRoom({ inviteCode: room.inviteCode });
    },
    queryKey: roomQueryKeys.join(roomId),
    retry: false,
    // room join is a mount-time POST, but useQuery handles Strict Mode remounts
    // without the observer loss that useEffect + useMutation can trigger.
    staleTime: Infinity,
  });

// 초대 코드로 수동 입장하는 다이얼로그용 mutation 훅
export const useJoinRoomMutation = (api: RoomApi = roomApi) =>
  useMutation({
    mutationFn: (body: JoinRoomRequest) => api.joinRoom(body),
  });

export const useUpdateRoom = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateRoomRequest) => roomApi.updateRoom(roomId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueryKeys.detail(roomId) }),
  });
};

export const useCloseRoom = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => roomApi.closeRoom(roomId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueryKeys.all }),
  });
};
