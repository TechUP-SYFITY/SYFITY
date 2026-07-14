// PlaylistPanel의 재생목록 순서 변경 동작을 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { PlaylistPanel } from './PlaylistPanel';
import { playlistApi } from '../api/playlistApi';
import { usePlaylistStore } from '../store/playlistStore';

vi.mock('../api/playlistApi', () => ({
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

const originalElementFromPoint = document.elementFromPoint;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

describe('PlaylistPanel reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaylistStore.getState().clearPlaylist();
  });

  afterEach(() => {
    cleanup();
    if (originalElementFromPoint) {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: originalElementFromPoint,
      });
    } else {
      Reflect.deleteProperty(document, 'elementFromPoint');
    }
    usePlaylistStore.getState().clearPlaylist();
  });

  it.each(['touch', 'mouse'] as const)(
    'updates the store when a playlist item is moved down with a %s handle.',
    async (pointerType) => {
      usePlaylistStore.getState().setPlaylist([firstItem, secondItem]);
      vi.mocked(playlistApi.reorderPlaylist).mockResolvedValue({ message: 'ok' });

      render(
        <QueryClientProvider client={createQueryClient()}>
          <PlaylistPanel
            canControlRoom
            currentPlaylistItemId={firstItem.id}
            playlistItems={[firstItem, secondItem]}
            roomId={roomId}
            isHost
            isReady
            onOpenSearch={vi.fn()}
          />
        </QueryClientProvider>,
      );

      const firstRow = screen.getByTestId(`playlist-row-${firstItem.id}`);
      const secondRow = screen.getByTestId(`playlist-row-${secondItem.id}`);
      const firstHandle = screen.getByTestId(`playlist-drag-handle-${firstItem.id}`);
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: vi.fn(() => secondRow),
      });

      fireEvent.focus(firstRow);
      fireEvent.pointerDown(firstHandle, {
        clientX: 24,
        clientY: 24,
        pointerId: 1,
        pointerType,
      });
      fireEvent.pointerMove(firstHandle, {
        clientX: 24,
        clientY: 88,
        pointerId: 1,
        pointerType,
      });
      fireEvent.pointerUp(firstHandle, {
        clientX: 24,
        clientY: 88,
        pointerId: 1,
        pointerType,
      });

      await waitFor(() => {
        expect(playlistApi.reorderPlaylist).toHaveBeenCalledWith(roomId, {
          items: [
            { id: secondItem.id, position: 1 },
            { id: firstItem.id, position: 2 },
          ],
        });
      });
      expect(usePlaylistStore.getState().playlist.map((item) => item.id)).toEqual([
        secondItem.id,
        firstItem.id,
      ]);
    },
  );

  it('updates the store when a focused drag handle is moved down with keyboard.', async () => {
    usePlaylistStore.getState().setPlaylist([firstItem, secondItem]);
    vi.mocked(playlistApi.reorderPlaylist).mockResolvedValue({ message: 'ok' });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom
          currentPlaylistItemId={firstItem.id}
          playlistItems={[firstItem, secondItem]}
          roomId={roomId}
          isHost
          isReady
          onOpenSearch={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.keyDown(screen.getByTestId(`playlist-drag-handle-${firstItem.id}`), {
      key: 'ArrowDown',
    });

    await waitFor(() => {
      expect(playlistApi.reorderPlaylist).toHaveBeenCalledWith(roomId, {
        items: [
          { id: secondItem.id, position: 1 },
          { id: firstItem.id, position: 2 },
        ],
      });
    });
    expect(usePlaylistStore.getState().playlist.map((item) => item.id)).toEqual([
      secondItem.id,
      firstItem.id,
    ]);
  });
});
