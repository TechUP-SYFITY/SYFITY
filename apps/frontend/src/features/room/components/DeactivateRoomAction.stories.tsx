// closed Room 비활성화 확인 UI의 기본, pending, 오류 상태를 Storybook에서 제공한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DeactivateRoomAction } from './DeactivateRoomAction';

const meta = {
  title: 'Features/Room/DeactivateRoomAction',
  component: DeactivateRoomAction,
  parameters: {
    layout: 'centered',
  },
  args: {
    onConfirm: fn(),
    roomName: '지난 주말 음악 Room',
  },
} satisfies Meta<typeof DeactivateRoomAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Confirmation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '지난 주말 음악 Room 비활성화' }),
    );
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
  },
};

function PendingState() {
  const [isPending, setIsPending] = useState(false);

  return (
    <DeactivateRoomAction
      roomName="지난 주말 음악 Room"
      isPending={isPending}
      onConfirm={() => setIsPending(true)}
    />
  );
}

export const Pending: Story = {
  render: () => <PendingState />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '지난 주말 음악 Room 비활성화' }),
    );
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
    await userEvent.click(
      within(document.body).getByRole('button', { name: 'Room 비활성화 확인' }),
    );
    await expect(
      within(document.body).getByRole('button', { name: 'Room 비활성화 확인' }),
    ).toBeDisabled();
  },
};

export const Error: Story = {
  args: {
    errorMessage: '이 작업을 할 권한이 없어요.',
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '지난 주말 음악 Room 비활성화' }),
    );
    await waitFor(() => expect(within(document.body).getByRole('alert')).toBeVisible());
  },
};
