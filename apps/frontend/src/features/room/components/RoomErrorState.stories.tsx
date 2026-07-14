// Room 입장 실패 원인별 오류 상태를 Storybook에서 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ApiClientError } from '@/shared/types/api';

import { RoomErrorState } from './RoomErrorState';

const roomId = 'story-room';

function createRoomError(code: string, message = 'Room 입장에 실패했어요.') {
  return new ApiClientError({ code, message }, 400);
}

const meta = {
  title: 'Features/Room/RoomErrorState',
  component: RoomErrorState,
  parameters: { layout: 'fullscreen' },
  args: {
    error: createRoomError('ROOM_NOT_FOUND'),
    roomId,
  },
} satisfies Meta<typeof RoomErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotFound: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText('존재하지 않거나 입장할 수 없는 Room입니다.'),
    ).toBeInTheDocument();
  },
};

export const Closed: Story = {
  args: { error: createRoomError('ROOM_CLOSED') },
};

export const Inactive: Story = {
  args: { error: createRoomError('ROOM_INACTIVE') },
};

export const ServerUnavailable: Story = {
  args: { error: new Error('Failed to fetch') },
};
