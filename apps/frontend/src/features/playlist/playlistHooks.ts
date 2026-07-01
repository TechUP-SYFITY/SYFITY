'use client';

// Playlist REST API와 Socket 갱신 결과를 React 훅으로 연결한다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { socketClient } from '@/shared/lib/socket/socketClient';

import { playlistApi } from './playlistApi';
import { usePlaylistStore } from './playlistStore';
import type { AddPlaylistItemRequest, ReorderPlaylistRequest } from './playlistTypes';

export const playlistQueryKeys = {
  all: ['playlist'] as const,
  room: (roomId: string) => [...playlistQueryKeys.all, roomId] as const,
};

export const usePlaylist = (roomId: string, enabled = true) =>
  useQuery({
    enabled: enabled && roomId.length > 0,
    queryFn: () => playlistApi.getPlaylist(roomId),
    queryKey: playlistQueryKeys.room(roomId),
  });

export const useAddPlaylistItem = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AddPlaylistItemRequest) => playlistApi.addPlaylistItem(roomId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) }),
  });
};

export const useDeletePlaylistItem = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => playlistApi.deletePlaylistItem(roomId, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) }),
  });
};

export const useReorderPlaylist = (roomId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ReorderPlaylistRequest) => playlistApi.reorderPlaylist(roomId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: playlistQueryKeys.room(roomId) }),
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
