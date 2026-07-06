// PlaylistPanel의 API 상태별 Storybook 화면을 mock API로 재현한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { PlaylistItem } from '@/shared/types/domain';

import { playlistApi } from './playlistApi';
import { PlaylistPanel } from './PlaylistPanel';
import { usePlaylistStore } from './playlistStore';

const roomId = 'story-room';

const playlistItems: PlaylistItem[] = [
  {
    addedBy: 'story-host',
    channelTitle: 'One Direction',
    duration: 226,
    id: 'story-night-changes',
    position: 1,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
    title: 'Night Changes',
    videoId: 'syFZfO_wfMQ',
  },
  {
    addedBy: 'story-member-1',
    channelTitle: 'BTS',
    duration: 199,
    id: 'story-dynamite',
    position: 2,
    status: 'available',
    thumbnailUrl: 'https://i.ytimg.com/vi/gdZLi9oWNZg/hqdefault.jpg',
    title: 'Dynamite',
    videoId: 'gdZLi9oWNZg',
  },
  {
    addedBy: 'story-member-2',
    channelTitle: 'Dua Lipa',
    duration: 203,
    id: 'story-levitating',
    position: 3,
    status: 'unavailable',
    thumbnailUrl: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg',
    title: 'Levitating',
    videoId: 'TUVcZfQe-Kw',
  },
];

const meta = {
  title: 'Features/Playlist/PlaylistPanel',
  component: PlaylistPanel,
  parameters: { layout: 'centered' },
  args: {
    roomId,
    isHost: true,
    isReady: true,
    onPlayItem: () => undefined,
  },
} satisfies Meta<typeof PlaylistPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

type PlaylistApiMock = Partial<typeof playlistApi>;
type StoryRender = () => ReactNode;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createPendingPromise<T>() {
  return new Promise<T>(() => undefined);
}

function createDefaultApiMock(): typeof playlistApi {
  return {
    addPlaylistItem: async (_roomId, body) => ({
      addedBy: 'story-host',
      channelTitle: 'Story Channel',
      duration: 180,
      id: 'story-added-track',
      position: playlistItems.length + 1,
      status: 'available',
      thumbnailUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
      title: body.youtubeUrl ?? body.videoId ?? 'Added Story Track',
      videoId: body.videoId ?? 'story-added-video',
    }),
    deletePlaylistItem: async () => ({ message: 'playlist item deleted' }),
    getPlaylist: async () => ({ playlist: playlistItems }),
    reorderPlaylist: async () => ({ message: 'playlist reordered' }),
  };
}

function applyPlaylistApiMock(apiMock: PlaylistApiMock) {
  Object.assign(playlistApi, createDefaultApiMock(), apiMock);
}

function withPlaylistApiMock(apiMock: PlaylistApiMock = {}) {
  return function PlaylistApiMockDecorator(Story: StoryRender) {
    applyPlaylistApiMock(apiMock);
    usePlaylistStore.getState().clearPlaylist();

    return (
      <QueryClientProvider client={createQueryClient()}>
        <div className="h-[640px] w-[320px] overflow-hidden border border-white/[0.07] bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

export const ApiSuccess: Story = {
  decorators: [withPlaylistApiMock()],
};

export const ApiLoading: Story = {
  decorators: [
    withPlaylistApiMock({
      getPlaylist: () => createPendingPromise(),
    }),
  ],
};

export const ApiError: Story = {
  decorators: [
    withPlaylistApiMock({
      getPlaylist: async () => {
        throw new Error('Failed to fetch');
      },
    }),
  ],
};

export const Empty: Story = {
  decorators: [
    withPlaylistApiMock({
      getPlaylist: async () => ({ playlist: [] }),
    }),
  ],
};

export const ParentPlaylistData: Story = {
  args: {
    playlistItems,
  },
  decorators: [withPlaylistApiMock()],
};

export const MemberView: Story = {
  args: {
    isHost: false,
  },
  decorators: [withPlaylistApiMock()],
};
