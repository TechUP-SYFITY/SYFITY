'use client';

// 나만의 Playlist REST API를 React Query 훅으로 연결한다. (store 없이 Query 캐시로만 관리)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { personalPlaylistApi, type PersonalPlaylistApi } from '../api/personalPlaylistApi';
import type {
  AddPersonalPlaylistItemRequest,
  CreatePersonalPlaylistRequest,
  ImportPlaylistToRoomRequest,
  PersonalPlaylistDetail,
  PersonalPlaylistItem,
  ReorderPersonalPlaylistRequest,
  UpdatePersonalPlaylistRequest,
} from '../types/personalPlaylistTypes';

export const personalPlaylistQueryKeys = {
  all: ['personal-playlist'] as const,
  list: () => [...personalPlaylistQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...personalPlaylistQueryKeys.all, 'detail', id] as const,
};

export const useMyPlaylists = (api: PersonalPlaylistApi = personalPlaylistApi) =>
  useQuery({
    queryFn: () => api.getPlaylists(),
    queryKey: personalPlaylistQueryKeys.list(),
  });

export const useMyPlaylist = (
  id: string,
  enabled = true,
  api: PersonalPlaylistApi = personalPlaylistApi,
) =>
  useQuery({
    enabled: enabled && id.length > 0,
    queryFn: () => api.getPlaylist(id),
    queryKey: personalPlaylistQueryKeys.detail(id),
  });

export const useCreatePlaylist = (api: PersonalPlaylistApi = personalPlaylistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePersonalPlaylistRequest) => api.createPlaylist(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.list() }),
  });
};

export const useUpdatePlaylist = (id: string, api: PersonalPlaylistApi = personalPlaylistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdatePersonalPlaylistRequest) => api.updatePlaylist(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.list() });
    },
  });
};

export const useDeletePlaylist = (api: PersonalPlaylistApi = personalPlaylistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deletePlaylist(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.list() }),
  });
};

export const useAddPlaylistItem = (id: string, api: PersonalPlaylistApi = personalPlaylistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AddPersonalPlaylistItemRequest) => api.addItem(id, body),
    // 상세(곡 목록)와 목록(updatedAt 정렬) 캐시를 무효화한다.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.list() });
    },
  });
};

export const useDeletePlaylistItem = (
  id: string,
  api: PersonalPlaylistApi = personalPlaylistApi,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => api.deleteItem(id, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: personalPlaylistQueryKeys.detail(id) });

      const previous = queryClient.getQueryData<PersonalPlaylistDetail>(
        personalPlaylistQueryKeys.detail(id),
      );
      if (previous) {
        queryClient.setQueryData<PersonalPlaylistDetail>(personalPlaylistQueryKeys.detail(id), {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
        });
      }

      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(personalPlaylistQueryKeys.detail(id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.list() });
    },
  });
};

export const useReorderPlaylist = (id: string, api: PersonalPlaylistApi = personalPlaylistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ReorderPersonalPlaylistRequest) => api.reorder(id, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: personalPlaylistQueryKeys.detail(id) });

      const previous = queryClient.getQueryData<PersonalPlaylistDetail>(
        personalPlaylistQueryKeys.detail(id),
      );
      if (previous) {
        queryClient.setQueryData<PersonalPlaylistDetail>(personalPlaylistQueryKeys.detail(id), {
          ...previous,
          items: reorderItems(previous.items, body),
        });
      }

      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(personalPlaylistQueryKeys.detail(id), context.previous);
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: personalPlaylistQueryKeys.detail(id) }),
  });
};

export const useImportPlaylistToRoom = (
  roomId: string,
  api: PersonalPlaylistApi = personalPlaylistApi,
) =>
  useMutation({
    mutationFn: (body: ImportPlaylistToRoomRequest) => api.importToRoom(roomId, body),
  });

function reorderItems(items: PersonalPlaylistItem[], body: ReorderPersonalPlaylistRequest) {
  const positionById = new Map(body.items.map((item) => [item.id, item.position]));

  return [...items]
    .map((item) => ({ ...item, position: positionById.get(item.id) ?? item.position }))
    .sort((a, b) => a.position - b.position);
}
