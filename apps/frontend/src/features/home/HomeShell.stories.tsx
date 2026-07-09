import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { authQueryKeys } from '@/features/auth/hooks/useAuth';
import { roomQueryKeys } from '@/features/room/roomHooks';

import { previewRecentRooms } from './homePreviewData';
import { HomeShell } from './HomeShell';

const meta = {
  title: 'Features/Home/HomeShell',
  component: HomeShell,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HomeShell>;

export default meta;
type Story = StoryObj<typeof meta>;

type StoryRender = () => ReactNode;

function createQueryClientWithData(data: { user: unknown; rooms: unknown }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  queryClient.setQueryData(authQueryKeys.me(), data.user);
  queryClient.setQueryData(roomQueryKeys.recent(), data.rooms);

  return queryClient;
}

export const Default: Story = {
  decorators: [
    (Story: StoryRender) => {
      const queryClient = createQueryClientWithData({
        user: {
          id: 'user-1',
          email: 'alice@syfity.com',
          nickname: 'Alice',
          profileImage: null,
        },
        rooms: {
          rooms: previewRecentRooms,
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export const EmptyRooms: Story = {
  decorators: [
    (Story: StoryRender) => {
      const queryClient = createQueryClientWithData({
        user: {
          id: 'user-1',
          email: 'alice@syfity.com',
          nickname: 'Alice',
          profileImage: null,
        },
        rooms: {
          rooms: [],
        },
      });

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export const Loading: Story = {
  decorators: [
    (Story: StoryRender) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });
      // Query cache is empty -> queries stay in pending/loading state

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
