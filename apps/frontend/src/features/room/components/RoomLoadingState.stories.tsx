// Room 입장 로딩 상태를 Storybook에서 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { RoomLoadingState } from './RoomLoadingState';

const meta = {
  title: 'Features/Room/RoomLoadingState',
  component: RoomLoadingState,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RoomLoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Room 입장 중')).toBeInTheDocument();
  },
};
