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
    usePlaylistStore.getState().clearPlaylist();
  });

  it('connects the host drag handle to sortable semantics.', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom
          currentPlaylistItemId={firstItem.id}
          isActiveRoomMember
          playlistItems={[firstItem, secondItem]}
          roomId={roomId}
          isHost
          isReady
          onOpenSearch={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const firstHandle = screen.getByTestId(`playlist-drag-handle-${firstItem.id}`);

    expect(firstHandle).toHaveAttribute('aria-roledescription', '정렬 가능한 항목');
    expect(firstHandle).toHaveAttribute('aria-pressed', 'false');
    expect(firstHandle).toHaveClass('touch-none');
    expect(
      screen.getByText('위쪽 또는 아래쪽 화살표 키로 재생목록 순서를 변경할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('updates the store when a focused drag handle is moved down with keyboard.', async () => {
    usePlaylistStore.getState().setPlaylist([firstItem, secondItem]);
    vi.mocked(playlistApi.reorderPlaylist).mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom
          currentPlaylistItemId={firstItem.id}
          isActiveRoomMember
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

  it('updates the store when a focused drag handle is moved up with keyboard.', async () => {
    usePlaylistStore.getState().setPlaylist([firstItem, secondItem]);
    vi.mocked(playlistApi.reorderPlaylist).mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom
          currentPlaylistItemId={firstItem.id}
          isActiveRoomMember
          playlistItems={[firstItem, secondItem]}
          roomId={roomId}
          isHost
          isReady
          onOpenSearch={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.keyDown(screen.getByTestId(`playlist-drag-handle-${secondItem.id}`), {
      key: 'ArrowUp',
    });

    await waitFor(() => {
      expect(playlistApi.reorderPlaylist).toHaveBeenCalledWith(roomId, {
        items: [
          { id: secondItem.id, position: 1 },
          { id: firstItem.id, position: 2 },
        ],
      });
    });
  });

  it('does not expose reorder handles to a member.', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom={false}
          currentPlaylistItemId={firstItem.id}
          isActiveRoomMember
          playlistItems={[firstItem, secondItem]}
          roomId={roomId}
          isHost={false}
          isReady
          onOpenSearch={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId(`playlist-drag-handle-${firstItem.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`playlist-drag-handle-${secondItem.id}`)).not.toBeInTheDocument();
  });
});
