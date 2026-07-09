import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { previewRecentRooms } from './homePreviewData';
import { HomeShell } from './HomeShell';

const meta = {
  title: 'Features/Home/HomeShell',
  component: HomeShell,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    nickname: 'Alice',
    isUserLoading: false,
    isRoomsLoading: false,
    onCreateRoom: () => {},
    onJoinRoom: () => {},
  },
} satisfies Meta<typeof HomeShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    rooms: previewRecentRooms,
  },
};

export const EmptyRooms: Story = {
  args: {
    rooms: [],
  },
};

export const Loading: Story = {
  args: {
    rooms: [],
    isUserLoading: true,
    isRoomsLoading: true,
  },
};
