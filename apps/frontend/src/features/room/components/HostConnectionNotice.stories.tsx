// Host 연결 대기와 Room 종료 배너 상태를 Storybook에서 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { HostConnectionNotice } from './HostConnectionNotice';

const meta = {
  title: 'Features/Room/HostConnectionNotice',
  component: HostConnectionNotice,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    hostConnection: {
      status: 'disconnected',
      waitUntil: '2099-01-01T00:00:00.000Z',
    },
  },
} satisfies Meta<typeof HostConnectionNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disconnected: Story = {
  render: () => (
    <HostConnectionNotice
      hostConnection={{
        status: 'disconnected',
        waitUntil: new Date(Date.now() + 60_000).toISOString(),
      }}
    />
  ),
};

export const ClosedByTimeout: Story = {
  args: {
    hostConnection: {
      reason: 'host-timeout',
      status: 'closed',
    },
  },
};
