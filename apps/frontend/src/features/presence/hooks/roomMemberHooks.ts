'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { roomMemberApi } from '../api/roomMemberApi';

export const roomMemberQueryKeys = {
  all: (roomId: string) => ['rooms', roomId, 'members'] as const,
  active: (roomId: string) => [...roomMemberQueryKeys.all(roomId), 'active'] as const,
  kicked: (roomId: string) => [...roomMemberQueryKeys.all(roomId), 'kicked'] as const,
};

export const useActiveRoomMembers = (roomId: string, enabled: boolean) =>
  useQuery({
    enabled: enabled && roomId.length > 0,
    queryFn: () => roomMemberApi.getActiveMembers(roomId),
    queryKey: roomMemberQueryKeys.active(roomId),
  });

export const useKickedRoomMembers = (roomId: string, enabled: boolean) =>
  useQuery({
    enabled: enabled && roomId.length > 0,
    queryFn: () => roomMemberApi.getKickedMembers(roomId),
    queryKey: roomMemberQueryKeys.kicked(roomId),
  });

const useUpdateRoomMember = (roomId: string, status: 'kicked' | 'left') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => roomMemberApi.updateMember(roomId, memberId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomMemberQueryKeys.all(roomId) }),
  });
};

export const useKickRoomMember = (roomId: string) => useUpdateRoomMember(roomId, 'kicked');

export const useUnkickRoomMember = (roomId: string) => useUpdateRoomMember(roomId, 'left');
