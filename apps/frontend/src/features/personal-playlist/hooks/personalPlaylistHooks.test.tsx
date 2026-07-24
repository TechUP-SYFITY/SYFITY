// 개인 Playlist 훅의 낙관적 업데이트와 실패 롤백을 검증한다.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import {
  personalPlaylistQueryKeys,
  useCreatePlaylist,
  useDeletePlaylistItem,
  useImportPlaylistToRoom,
  useReorderPlaylist,
} from './personalPlaylistHooks';
import type { PersonalPlaylistApi } from '../api/personalPlaylistApi';
import type {
  PersonalPlaylistDetail,
  ReorderPersonalPlaylistResponse,
} from '../types/personalPlaylistTypes';

const playlistId = 'pl-1';

const item = (id: string, position: number): PlaylistItem => ({
  addedBy: 'user-1',
  channelTitle: 'Channel',
  duration: 200,
  id,
  position,
  status: 'available',
  thumbnailUrl: `https://example.com/${id}.jpg`,
  title: `Song ${id}`,
  videoId: `video-${id}`,
});

const firstItem = item('item-1', 1);
const secondItem = item('item-2', 2);

const detail: PersonalPlaylistDetail = {
  playlist: {
    id: playlistId,
    name: '밤 드라이브',
    createdAt: '2026-07-18T10:00:00.000Z',
    updatedAt: '2026-07-20T12:00:00.000Z',
  },
  items: [firstItem, secondItem],
};

function createApi(override: Partial<PersonalPlaylistApi> = {}): PersonalPlaylistApi {
  return {
    addItem: vi.fn(),
    createPlaylist: vi.fn(),
    deleteItem: vi.fn().mockResolvedValue(undefined),
    deletePlaylist: vi.fn(),
    getPlaylist: vi.fn(),
    getPlaylists: vi.fn(),
    importToRoom: vi.fn(),
    reorder: vi.fn().mockResolvedValue(undefined),
    updatePlaylist: vi.fn(),
    ...override,
  } as unknown as PersonalPlaylistApi;
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
}

function seedDetail(queryClient: QueryClient) {
  queryClient.setQueryData(personalPlaylistQueryKeys.detail(playlistId), detail);
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const readDetail = (queryClient: QueryClient) =>
  queryClient.getQueryData<PersonalPlaylistDetail>(personalPlaylistQueryKeys.detail(playlistId));

describe('useDeletePlaylistItem', () => {
  it('요청이 끝나기 전에 곡을 목록에서 제거한다', async () => {
    const queryClient = createQueryClient();
    seedDetail(queryClient);
    const api = createApi({ deleteItem: vi.fn(() => new Promise<void>(() => undefined)) });
    const { result } = renderHook(() => useDeletePlaylistItem(playlistId, api), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate(firstItem.id);

    await waitFor(() => {
      expect(readDetail(queryClient)?.items.map((entry) => entry.id)).toEqual([secondItem.id]);
    });
  });

  it('삭제가 실패하면 이전 목록으로 되돌린다', async () => {
    const queryClient = createQueryClient();
    seedDetail(queryClient);
    const api = createApi({ deleteItem: vi.fn().mockRejectedValue(new Error('delete failed')) });
    const { result } = renderHook(() => useDeletePlaylistItem(playlistId, api), {
      wrapper: wrapperFor(queryClient),
    });

    await expect(result.current.mutateAsync(firstItem.id)).rejects.toThrow('delete failed');

    await waitFor(() => {
      expect(readDetail(queryClient)?.items.map((entry) => entry.id)).toEqual([
        firstItem.id,
        secondItem.id,
      ]);
    });
  });
});

describe('useReorderPlaylist', () => {
  it('요청 전에 전달된 position 순서로 목록을 재정렬한다', async () => {
    const queryClient = createQueryClient();
    seedDetail(queryClient);
    const api = createApi({
      reorder: vi.fn(() => new Promise<ReorderPersonalPlaylistResponse>(() => undefined)),
    });
    const { result } = renderHook(() => useReorderPlaylist(playlistId, api), {
      wrapper: wrapperFor(queryClient),
    });

    // 낙관적 캐시가 전달된 position 오름차순으로 재정렬하는지 확인 (position은 1-based)
    result.current.mutate({
      items: [
        { id: secondItem.id, position: 1 },
        { id: firstItem.id, position: 2 },
      ],
    });

    await waitFor(() => {
      expect(readDetail(queryClient)?.items.map((entry) => entry.id)).toEqual([
        secondItem.id,
        firstItem.id,
      ]);
    });
  });

  it('순서 변경이 실패하면 이전 순서로 되돌린다', async () => {
    const queryClient = createQueryClient();
    seedDetail(queryClient);
    const api = createApi({ reorder: vi.fn().mockRejectedValue(new Error('reorder failed')) });
    const { result } = renderHook(() => useReorderPlaylist(playlistId, api), {
      wrapper: wrapperFor(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        items: [
          { id: secondItem.id, position: 1 },
          { id: firstItem.id, position: 2 },
        ],
      }),
    ).rejects.toThrow('reorder failed');

    await waitFor(() => {
      expect(readDetail(queryClient)?.items.map((entry) => entry.id)).toEqual([
        firstItem.id,
        secondItem.id,
      ]);
    });
  });

  it('payload에 없는 항목은 기존 position을 유지한다', async () => {
    const queryClient = createQueryClient();
    seedDetail(queryClient);
    const api = createApi({
      reorder: vi.fn(() => new Promise<ReorderPersonalPlaylistResponse>(() => undefined)),
    });
    const { result } = renderHook(() => useReorderPlaylist(playlistId, api), {
      wrapper: wrapperFor(queryClient),
    });

    // firstItem만 뒤로 보낸다. payload에 없는 secondItem은 기존 position(2)을 유지한다.
    result.current.mutate({ items: [{ id: firstItem.id, position: 3 }] });

    await waitFor(() => {
      expect(readDetail(queryClient)?.items.map((entry) => entry.id)).toEqual([
        secondItem.id,
        firstItem.id,
      ]);
    });
  });
});

describe('useCreatePlaylist / useImportPlaylistToRoom', () => {
  it('생성 성공 시 목록 쿼리를 무효화한다', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const api = createApi({
      createPlaylist: vi.fn().mockResolvedValue({
        id: 'pl-new',
        name: '새 리스트',
        createdAt: '2026-07-21T00:00:00.000Z',
      }),
    });
    const { result } = renderHook(() => useCreatePlaylist(api), {
      wrapper: wrapperFor(queryClient),
    });

    await result.current.mutateAsync({ name: '새 리스트' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: personalPlaylistQueryKeys.list() });
  });

  it('불러오기는 roomId와 personalPlaylistId로 API를 호출한다', async () => {
    const queryClient = createQueryClient();
    const importToRoom = vi
      .fn()
      .mockResolvedValue({ addedCount: 2, duplicateCount: 1, unavailableCount: 0 });
    const { result } = renderHook(
      () => useImportPlaylistToRoom('room-1', createApi({ importToRoom })),
      { wrapper: wrapperFor(queryClient) },
    );

    await result.current.mutateAsync({ personalPlaylistId: playlistId });

    expect(importToRoom).toHaveBeenCalledWith('room-1', { personalPlaylistId: playlistId });
  });
});
