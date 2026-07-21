'use client';

// Playlist REST API와 Socket 갱신 결과를 React 훅으로 연결한다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { PlaylistItem } from '@/shared/types/domain';

import { playlistApi, type PlaylistApi } from '../api/playlistApi';
import { usePlaylistStore } from '../store/playlistStore';
import type {
  AddPlaylistItemRequest,
  PlaylistResponse,
  ReorderPlaylistRequest,
} from '../types/playlistTypes';

export const playlistQueryKeys = {
  all: ['playlist'] as const,
  room: (roomId: string) => [...playlistQueryKeys.all, roomId] as const,
};

export const usePlaylist = (roomId: string, enabled = true, api: PlaylistApi = playlistApi) =>
  useQuery({
    enabled: enabled && roomId.length > 0,
    queryFn: () => api.getPlaylist(roomId),
    queryKey: playlistQueryKeys.room(roomId),
  });

export const useAddPlaylistItem = (roomId: string, api: PlaylistApi = playlistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AddPlaylistItemRequest) => api.addPlaylistItem(roomId, body),
    onSuccess: (createdItem) => {
      const currentPlaylist = getCurrentPlaylist(queryClient, roomId);
      const nextPlaylist = currentPlaylist.some((item) => item.id === createdItem.id)
        ? currentPlaylist
        : sortPlaylist([...currentPlaylist, createdItem]);

      applyPlaylist(queryClient, roomId, nextPlaylist);
      return queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) });
    },
  });
};

export const useDeletePlaylistItem = (roomId: string, api: PlaylistApi = playlistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => api.deletePlaylistItem(roomId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: playlistQueryKeys.room(roomId) });

      const previousPlaylist = getCurrentPlaylist(queryClient, roomId);
      applyPlaylist(
        queryClient,
        roomId,
        previousPlaylist.filter((item) => item.id !== itemId),
      );

      return { previousPlaylist };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previousPlaylist) {
        applyPlaylist(queryClient, roomId, context.previousPlaylist);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) }),
  });
};

export const useReorderPlaylist = (roomId: string, api: PlaylistApi = playlistApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ReorderPlaylistRequest) => api.reorderPlaylist(roomId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: playlistQueryKeys.room(roomId) });

      const previousPlaylist = getCurrentPlaylist(queryClient, roomId);
      applyPlaylist(queryClient, roomId, reorderPlaylist(previousPlaylist, body));

      return { previousPlaylist };
    },
    onError: (_error, _body, context) => {
      if (context?.previousPlaylist) {
        applyPlaylist(queryClient, roomId, context.previousPlaylist);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) }),
  });
};

export const usePlaylistSocket = (roomId: string) => {
  const queryClient = useQueryClient();
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();

    socket.on('playlist:updated', (payload) => {
      setPlaylist(payload.playlist);
      queryClient.setQueryData(playlistQueryKeys.room(roomId), { playlist: payload.playlist });
    });

    return () => {
      socket.off('playlist:updated');
    };
  }, [queryClient, roomId, setPlaylist]);
};

function getCurrentPlaylist(queryClient: ReturnType<typeof useQueryClient>, roomId: string) {
  const cached = queryClient.getQueryData<PlaylistResponse>(playlistQueryKeys.room(roomId));
  return cached?.playlist ?? usePlaylistStore.getState().playlist;
}

function applyPlaylist(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId: string,
  playlist: PlaylistItem[],
) {
  usePlaylistStore.getState().setPlaylist(playlist);
  queryClient.setQueryData<PlaylistResponse>(playlistQueryKeys.room(roomId), { playlist });
}

function reorderPlaylist(playlist: PlaylistItem[], body: ReorderPlaylistRequest) {
  const positionById = new Map(body.items.map((item) => [item.id, item.position]));

  return sortPlaylist(
    playlist.map((item) => ({
      ...item,
      position: positionById.get(item.id) ?? item.position,
    })),
  );
}

function sortPlaylist(playlist: PlaylistItem[]) {
  return [...playlist].sort((a, b) => a.position - b.position);
}
