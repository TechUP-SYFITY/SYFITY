// Playlist API 성공과 실패에 따른 프론트 상태 갱신을 검증한다.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { playlistApi } from './playlistApi';
import {
  playlistQueryKeys,
  useAddPlaylistItem,
  useDeletePlaylistItem,
  useReorderPlaylist,
} from './playlistHooks';
import { usePlaylistStore } from './playlistStore';

vi.mock('./playlistApi', () => ({
  playlistApi: {
    addPlaylistItem: vi.fn(),
    deletePlaylistItem: vi.fn(),
    getPlaylist: vi.fn(),
    reorderPlaylist: vi.fn(),
  },
}));

const roomId = 'room-1';

const firstItem: PlaylistItem = {
  addedBy: 'user-1',
  channelTitle: 'Channel One',
  duration: 180,
  id: 'playlist-item-1',
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://example.com/one.jpg',
  title: 'Song One',
  videoId: 'video-1',
};

const secondItem: PlaylistItem = {
  addedBy: 'user-2',
  channelTitle: 'Channel Two',
  duration: 200,
  id: 'playlist-item-2',
  position: 2,
  status: 'available',
  thumbnailUrl: 'https://example.com/two.jpg',
  title: 'Song Two',
  videoId: 'video-2',
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function seedPlaylist(queryClient: QueryClient, playlist: PlaylistItem[]) {
  usePlaylistStore.getState().setPlaylist(playlist);
  queryClient.setQueryData(playlistQueryKeys.room(roomId), { playlist });
}

describe('playlistHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaylistStore.getState().clearPlaylist();
  });

  it('곡 추가 성공 시 store와 query cache에 새 곡을 반영한다', async () => {
    const queryClient = createQueryClient();
    const createdItem = { ...secondItem, position: 2 };
    seedPlaylist(queryClient, [firstItem]);
    vi.mocked(playlistApi.addPlaylistItem).mockResolvedValue(createdItem);
    const { result } = renderHook(() => useAddPlaylistItem(roomId), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ youtubeUrl: 'https://youtu.be/video-2' });

    expect(playlistApi.addPlaylistItem).toHaveBeenCalledWith(roomId, {
      youtubeUrl: 'https://youtu.be/video-2',
    });
    expect(usePlaylistStore.getState().playlist).toEqual([firstItem, createdItem]);
    expect(queryClient.getQueryData(playlistQueryKeys.room(roomId))).toEqual({
      playlist: [firstItem, createdItem],
    });
  });

  it('곡 삭제 성공 시 삭제된 곡을 store와 query cache에서 제거한다', async () => {
    const queryClient = createQueryClient();
    seedPlaylist(queryClient, [firstItem, secondItem]);
    vi.mocked(playlistApi.deletePlaylistItem).mockResolvedValue({
      message: 'playlist item deleted',
    });
    const { result } = renderHook(() => useDeletePlaylistItem(roomId), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync(firstItem.id);

    expect(playlistApi.deletePlaylistItem).toHaveBeenCalledWith(roomId, firstItem.id);
    expect(usePlaylistStore.getState().playlist).toEqual([secondItem]);
    expect(queryClient.getQueryData(playlistQueryKeys.room(roomId))).toEqual({
      playlist: [secondItem],
    });
  });

  it('곡 삭제 실패 시 이전 목록으로 복구한다', async () => {
    const queryClient = createQueryClient();
    const previousPlaylist = [firstItem, secondItem];
    seedPlaylist(queryClient, previousPlaylist);
    vi.mocked(playlistApi.deletePlaylistItem).mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => useDeletePlaylistItem(roomId), {
      wrapper: createWrapper(queryClient),
    });

    await expect(result.current.mutateAsync(firstItem.id)).rejects.toThrow('delete failed');
    await waitFor(() => {
      expect(usePlaylistStore.getState().playlist).toEqual(previousPlaylist);
    });
  });

  it('순서 변경 성공 시 store와 query cache에 새 순서를 반영한다', async () => {
    const queryClient = createQueryClient();
    seedPlaylist(queryClient, [firstItem, secondItem]);
    vi.mocked(playlistApi.reorderPlaylist).mockResolvedValue({ message: 'playlist reordered' });
    const { result } = renderHook(() => useReorderPlaylist(roomId), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      items: [
        { id: firstItem.id, position: 2 },
        { id: secondItem.id, position: 1 },
      ],
    });

    const expectedPlaylist = [
      { ...secondItem, position: 1 },
      { ...firstItem, position: 2 },
    ];
    expect(playlistApi.reorderPlaylist).toHaveBeenCalledWith(roomId, {
      items: [
        { id: firstItem.id, position: 2 },
        { id: secondItem.id, position: 1 },
      ],
    });
    expect(usePlaylistStore.getState().playlist).toEqual(expectedPlaylist);
    expect(queryClient.getQueryData(playlistQueryKeys.room(roomId))).toEqual({
      playlist: expectedPlaylist,
    });
  });

  it('순서 변경 실패 시 이전 순서로 복구한다', async () => {
    const queryClient = createQueryClient();
    const previousPlaylist = [firstItem, secondItem];
    seedPlaylist(queryClient, previousPlaylist);
    vi.mocked(playlistApi.reorderPlaylist).mockRejectedValue(new Error('reorder failed'));
    const { result } = renderHook(() => useReorderPlaylist(roomId), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        items: [
          { id: firstItem.id, position: 2 },
          { id: secondItem.id, position: 1 },
        ],
      }),
    ).rejects.toThrow('reorder failed');
    await waitFor(() => {
      expect(usePlaylistStore.getState().playlist).toEqual(previousPlaylist);
    });
  });
});
