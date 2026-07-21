// Room 종료와 명시적 퇴장 액션의 역할별 상태를 Storybook에서 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { RoomExitAction } from './RoomExitAction';

const meta = {
  title: 'Features/Room/RoomExitAction',
  component: RoomExitAction,
  parameters: {
    layout: 'centered',
  },
  args: {
    onConfirm: fn(),
    role: 'host',
  },
} satisfies Meta<typeof RoomExitAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Host: Story = {};

export const HostConfirmation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Room 종료' }));
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
  },
};

function HostPendingState() {
  const [isPending, setIsPending] = useState(false);

  return <RoomExitAction role="host" isPending={isPending} onConfirm={() => setIsPending(true)} />;
}

export const HostPending: Story = {
  render: () => <HostPendingState />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Room 종료' }));
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
    await userEvent.click(within(document.body).getByRole('button', { name: 'Room 종료 확인' }));
    await expect(
      within(document.body).getByRole('button', { name: 'Room 종료 확인' }),
    ).toBeDisabled();
  },
};

function HostErrorState() {
  const [errorMessage, setErrorMessage] = useState<string>();

  return (
    <RoomExitAction
      role="host"
      errorMessage={errorMessage}
      onConfirm={() => setErrorMessage('Room 종료 요청에 실패했어요.')}
    />
  );
}

export const HostError: Story = {
  render: () => <HostErrorState />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Room 종료' }));
    await waitFor(() => expect(within(document.body).getByRole('dialog')).toBeVisible());
    await userEvent.click(within(document.body).getByRole('button', { name: 'Room 종료 확인' }));
    await expect(within(document.body).getByRole('alert')).toBeVisible();
  },
};

export const Member: Story = {
  args: {
    role: 'member',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
