import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ComponentProps, type ComponentType, useState } from 'react';
import { expect, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';

import { MemberManagementProvider } from './MemberManagementProvider';
import { MemberSidebar } from './MemberSidebar';
import type { PresenceMember } from '../types/presence';

const members: PresenceMember[] = [
  ...Array.from({ length: 3 }, (_, index) => ({
    nickname: `온라인 멤버 ${index + 1}`,
    profileImage: null,
    role: index === 0 ? ('host' as const) : ('member' as const),
    status: 'online' as const,
    userId: `online-${index + 1}`,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    nickname: `오프라인 멤버 ${index + 1}`,
    profileImage: null,
    role: 'member' as const,
    status: 'offline' as const,
    userId: `offline-${index + 1}`,
  })),
];

type MemberSidebarStoryProps = ComponentProps<typeof MemberSidebar> & { isHost: boolean };

function MemberSidebarStory({ isHost, ...props }: MemberSidebarStoryProps) {
  return (
    <MemberManagementProvider currentUserId="online-1" isHost={isHost} roomId="preview-room">
      <MemberSidebar {...props} />
    </MemberManagementProvider>
  );
}

function MemberManagementStoryDecorator(Story: ComponentType) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Story />
      </ToastProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: 'Features/Presence/MemberSidebar',
  component: MemberSidebarStory,
  args: { isHost: false, members },
  decorators: [
    MemberManagementStoryDecorator,
    (Story) => (
      <div className="flex h-96 w-72 overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberSidebarStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('3명')).resolves.toBeInTheDocument();
  },
};

export const AllOffline: Story = {
  args: { members: members.map((member) => ({ ...member, status: 'offline' as const })) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('0명')).resolves.toBeInTheDocument();
  },
};

export const HostManagement: Story = {
  args: { isHost: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).findByRole('button', { name: '추방 관리' }),
    ).resolves.toBeEnabled();
  },
};
