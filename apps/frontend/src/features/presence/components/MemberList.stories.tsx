import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { type ComponentProps, type ComponentType, useState } from 'react';
import { expect, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';

import { MemberList } from './MemberList';
import { MemberManagementProvider } from './MemberManagementProvider';
import type { PresenceMember } from '../types/presence';

const members: PresenceMember[] = [
  {
    nickname: '민지',
    profileImage: 'https://i.pravatar.cc/128?img=47',
    role: 'host',
    status: 'online',
    userId: 'host-1',
  },
  {
    nickname: '지민',
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: 'member-1',
  },
  {
    nickname: '박아리',
    profileImage: null,
    role: 'member',
    status: 'offline',
    userId: 'member-2',
  },
];

type MemberListStoryProps = ComponentProps<typeof MemberList> & { isHost: boolean };

function MemberListStory({ isHost, ...props }: MemberListStoryProps) {
  return (
    <MemberManagementProvider currentUserId="host-1" isHost={isHost} roomId="preview-room">
      <MemberList {...props} />
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
  title: 'Features/Presence/MemberList',
  component: MemberListStory,
  args: { isHost: false, members },
  decorators: [
    MemberManagementStoryDecorator,
    (Story) => (
      <div className="w-72 bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberListStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnlineOnly: Story = {
  args: { members: members.slice(0, 2) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('온라인 · 2')).resolves.toBeInTheDocument();
    await expect(canvas.queryByText(/오프라인/)).toBeNull();
  },
};

export const OnlineAndOffline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('온라인 · 2')).resolves.toBeInTheDocument();
    await expect(canvas.findByText('오프라인 · 1')).resolves.toBeInTheDocument();
  },
};

export const WithHost: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('민지')).resolves.toBeInTheDocument();
    await expect(canvasElement.querySelector('svg')).not.toBeNull();
  },
};

export const HostManagement: Story = {
  args: { isHost: true },
  parameters: {
    msw: {
      handlers: [
        http.get('*/api/v1/rooms/:roomId/members', () =>
          HttpResponse.json({
            success: true,
            data: {
              members: members.map((member, index) => ({
                ...member,
                id: `membership-${index + 1}`,
              })),
            },
          }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByRole('button', { name: '지민 멤버 관리' })).resolves.toBeEnabled();
  },
};

export const Empty: Story = {
  args: { members: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText(/온라인|오프라인/)).toBeNull();
  },
};

export const ManyMembersScrollable: Story = {
  args: {
    members: Array.from({ length: 24 }, (_, index) => ({
      nickname: `멤버 ${index + 1}`,
      profileImage: null,
      role: 'member' as const,
      status: 'online' as const,
      userId: `member-${index + 1}`,
    })),
  },
};

export const ExcludesLeftMembers: Story = {
  args: {
    members: [
      ...members,
      {
        nickname: '떠난 멤버',
        profileImage: null,
        role: 'member',
        status: 'left',
        userId: 'left-member',
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('떠난 멤버')).toBeNull();
  },
};
