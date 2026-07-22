import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { previewMyRooms, previewRecentRooms } from './homePreviewData';
import { HomeShell } from './HomeShell';

const meta = {
  title: 'Features/Home/HomeShell',
  component: HomeShell,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    nickname: 'Alice',
    isMyRoomsError: false,
    isMyRoomsLoading: false,
    isRecentRoomsLoading: false,
    isUserLoading: false,
    myRooms: previewMyRooms,
    onCreateRoom: () => {},
    onJoinRoom: () => {},
    onRetryMyRooms: () => {},
    recentRooms: previewRecentRooms,
  },
} satisfies Meta<typeof HomeShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const EmptyRooms: Story = {
  args: {
    myRooms: [],
    recentRooms: [],
  },
};

export const Loading: Story = {
  args: {
    isMyRoomsLoading: true,
    isRecentRoomsLoading: true,
    isUserLoading: true,
    myRooms: [],
    recentRooms: [],
  },
};

export const MyRoomsError: Story = {
  args: {
    isMyRoomsError: true,
    myRooms: [],
  },
};
