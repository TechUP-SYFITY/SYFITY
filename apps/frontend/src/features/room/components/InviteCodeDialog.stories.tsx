import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import type { CreateRoomResponse } from '../roomTypes';
import { InviteCodeDialog } from './InviteCodeDialog';

const room: CreateRoomResponse = {
  id: 'story-room',
  name: 'Chill Night',
  inviteCode: '3F9A2C',
  status: 'active',
  createdAt: new Date().toISOString(),
};

const meta = {
  title: 'Features/Room/InviteCodeDialog',
  component: InviteCodeDialog,
  parameters: {
    layout: 'centered',
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
      },
    },
  },
  args: {
    room,
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof InviteCodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RoomCreated: Story = {
  args: { showEnterButton: true },
};

export const InviteOnly: Story = {
  args: { showEnterButton: false },
};

export const Mobile: Story = {
  args: { showEnterButton: true },
  globals: {
    viewport: { value: 'mobile', isRotated: false },
  },
};
