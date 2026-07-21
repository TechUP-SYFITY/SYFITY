'use client';

// Room REST API를 TanStack Query 훅으로 연결한다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SocketClient } from '@/shared/lib/socket/types';

import { roomApi, type RoomApi } from '../api/roomApi';
import type { CreateRoomRequest, UpdateRoomRequest } from '../types/roomTypes';

export const roomQueryKeys = {
  all: ['rooms'] as const,
  detail: (roomId: string) => [...roomQueryKeys.all, 'detail', roomId] as const,
  join: (roomId: string) => [...roomQueryKeys.all, 'join', roomId] as const,
  joinByCode: (inviteCode: string) => [...roomQueryKeys.all, 'join-by-code', inviteCode] as const,
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

      return roomApi.createRoomMembership({ inviteCode: room.inviteCode });
    },
    queryKey: roomQueryKeys.join(roomId),
    retry: false,
    // room join is a mount-time POST, but useQuery handles Strict Mode remounts
    // without the observer loss that useEffect + useMutation can trigger.
    // gcTime: 0 evicts the cache entry on unmount so re-entering the room always
    // refetches instead of replaying a stale playlist/playbackState snapshot.
    gcTime: 0,
    staleTime: Infinity,
  });

export const useJoinRoomByCode = (inviteCode: string, api: RoomApi = roomApi) =>
  useQuery({
    enabled: inviteCode.length > 0,
    queryFn: () => api.createRoomMembership({ inviteCode }),
    queryKey: roomQueryKeys.joinByCode(inviteCode),
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
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
    mutationFn: () => roomApi.updateRoom(roomId, { status: 'closed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueryKeys.all }),
  });
};

export const useLeaveRoom = (roomId: string, client: SocketClient = socketClient) => {
  return () => {
    const socket = client.get();

    if (!socket?.connected) {
      return false;
    }

    socket.emit('room:leave', { roomId });
    return true;
  };
};
