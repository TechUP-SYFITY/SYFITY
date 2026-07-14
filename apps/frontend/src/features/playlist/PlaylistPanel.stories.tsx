// PlaylistPanel의 API 상태를 Storybook mock API로 재현한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { PlaylistItem } from '@/shared/types/domain';

import type { PlaylistApi } from './playlistApi';
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
  parameters: {
    layout: 'centered',
    msw: { handlers: [] },
  },
  args: {
    canControlRoom: true,
    currentPlaylistItemId: 'story-night-changes',
    roomId,
    isHost: true,
    isReady: true,
    onOpenSearch: () => undefined,
    playlistApiClient: createPlaylistApiMock(),
  },
} satisfies Meta<typeof PlaylistPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

type PlaylistApiOverride = Partial<PlaylistApi>;
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

function createPlaylistApiMock(apiOverride: PlaylistApiOverride = {}): PlaylistApi {
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
    ...apiOverride,
  };
}

function withPlaylistStoryFrame() {
  return function PlaylistStoryFrameDecorator(Story: StoryRender) {
    usePlaylistStore.getState().clearPlaylist();

    return (
      <QueryClientProvider client={createQueryClient()}>
        <div className="h-96 w-80 overflow-hidden border border-border bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

export const ApiSuccess: Story = {
  decorators: [withPlaylistStoryFrame()],
};

export const ApiLoading: Story = {
  args: {
    playlistApiClient: createPlaylistApiMock({
      getPlaylist: () => createPendingPromise(),
    }),
  },
  decorators: [withPlaylistStoryFrame()],
};

export const ApiError: Story = {
  args: {
    playlistApiClient: createPlaylistApiMock({
      getPlaylist: async () => {
        throw new Error('Failed to fetch');
      },
    }),
  },
  decorators: [withPlaylistStoryFrame()],
};

export const Empty: Story = {
  args: {
    playlistApiClient: createPlaylistApiMock({
      getPlaylist: async () => ({ playlist: [] }),
    }),
  },
  decorators: [withPlaylistStoryFrame()],
};

export const ParentPlaylistData: Story = {
  args: {
    playlistItems,
  },
  decorators: [withPlaylistStoryFrame()],
};

export const MemberView: Story = {
  args: {
    canControlRoom: false,
    isHost: false,
  },
  decorators: [withPlaylistStoryFrame()],
};

export const HostControlsDisabled: Story = {
  args: {
    canControlRoom: false,
    isHost: true,
    isReady: false,
    playlistItems,
  },
  decorators: [withPlaylistStoryFrame()],
};

export const DeleteFailureInteraction: Story = {
  args: {
    playlistApiClient: createPlaylistApiMock({
      deletePlaylistItem: async () => {
        throw new Error('delete failed');
      },
    }),
  },
  decorators: [withPlaylistStoryFrame()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('playlist-row-story-night-changes'));

    await userEvent.click(await canvas.findByRole('button', { name: 'Night Changes 삭제' }));

    await expect(canvas.findByText('delete failed')).resolves.toBeInTheDocument();
  },
};
