import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { JoinedRoomData } from '@/shared/types/domain';

import type { YoutubeSearchResult } from '@/features/search/api/searchApi';

import { RoomPageClient } from './RoomPageClient';

const mocks = vi.hoisted(() => ({
  addPlaylistItemMutate: vi.fn(),
  joinRoomMutate: vi.fn(),
  searchPanelProps: [] as Array<{
    isOpen: boolean;
    onAddResult?: (result: YoutubeSearchResult) => void;
  }>,
}));

vi.mock('@/features/player/PlayerPanel', () => ({
  PlayerPanel: ({ roomId }: { roomId: string }) => <div data-testid="player-panel">{roomId}</div>,
}));

vi.mock('@/features/player/usePlaybackSocket', () => ({
  usePlaybackSocket: vi.fn(),
}));

vi.mock('@/features/playlist/playlistHooks', () => ({
  useAddPlaylistItem: () => ({
    mutate: mocks.addPlaylistItemMutate,
  }),
  usePlaylistSocket: vi.fn(),
}));

vi.mock('@/features/playlist/PlaylistPanel', () => ({
  PlaylistPanel: ({ onOpenSearch }: { onOpenSearch: () => void }) => (
    <button type="button" onClick={onOpenSearch}>
      open search
    </button>
  ),
}));

vi.mock('@/features/room/roomHooks', () => ({
  useJoinRoom: () => ({
    isError: false,
    mutate: mocks.joinRoomMutate,
  }),
}));

vi.mock('@/features/room/RoomShell', () => ({
  RoomShell: ({
    renderPlayerPanel,
    renderPlaylistPanel,
  }: {
    renderPlayerPanel: () => React.ReactNode;
    renderPlaylistPanel: () => React.ReactNode;
  }) => (
    <div>
      {renderPlayerPanel()}
      {renderPlaylistPanel()}
    </div>
  ),
}));

vi.mock('@/features/room/useRoomSocket', () => ({
  useRoomSocket: vi.fn(),
}));

vi.mock('@/features/search/components/SearchPanel', () => ({
  SearchPanel: (props: {
    isOpen: boolean;
    onAddResult?: (result: YoutubeSearchResult) => void;
  }) => {
    mocks.searchPanelProps.push(props);
    return props.isOpen ? <div data-testid="search-panel" /> : null;
  },
}));

const searchResult: YoutubeSearchResult = {
  channelTitle: 'Lofi Channel',
  duration: 180,
  thumbnailUrl: 'https://example.com/thumb.jpg',
  title: 'Lofi Track',
  videoId: 'video-1',
};

const joinedRoomData: JoinedRoomData = {
  members: [],
  playbackState: {
    currentTime: 0,
    isPlaying: false,
    playlistItemId: null,
    updatedAt: '2026-07-06T00:00:00.000Z',
    videoId: null,
  },
  playlist: [],
  recentChats: [],
  room: {
    hostId: 'user-1',
    id: 'room-uuid',
    inviteCode: '3D49D1',
    name: 'Codex Test Room',
    status: 'active',
  },
};

describe('RoomPageClient', () => {
  beforeEach(() => {
    mocks.addPlaylistItemMutate.mockReset();
    mocks.joinRoomMutate.mockReset();
    mocks.searchPanelProps.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('joins the room route segment as an invite code', async () => {
    render(<RoomPageClient roomId="3D49D1" />);

    await waitFor(() => expect(mocks.joinRoomMutate).toHaveBeenCalled());

    expect(mocks.joinRoomMutate.mock.calls[0]?.[0]).toEqual({ inviteCode: '3D49D1' });
  });

  it('adds a selected search result to the playlist', async () => {
    mocks.joinRoomMutate.mockImplementation((_body, options) => {
      options.onSuccess(joinedRoomData);
    });

    render(<RoomPageClient roomId="3D49D1" />);

    fireEvent.click(screen.getByRole('button', { name: 'open search' }));

    await waitFor(() => {
      expect(screen.getByTestId('search-panel')).toBeTruthy();
    });

    const latestSearchPanelProps = mocks.searchPanelProps.at(-1);
    expect(latestSearchPanelProps?.onAddResult).toEqual(expect.any(Function));

    latestSearchPanelProps?.onAddResult?.(searchResult);

    expect(mocks.addPlaylistItemMutate).toHaveBeenCalledWith({ videoId: 'video-1' });
  });
});
