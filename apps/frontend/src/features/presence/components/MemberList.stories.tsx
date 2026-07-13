import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { PresenceMember } from '../presenceStore';
import { MemberList } from './MemberList';

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

const meta = {
  title: 'Features/Presence/MemberList',
  component: MemberList,
  args: { members },
  decorators: [
    (Story) => (
      <div className="w-72 bg-background text-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberList>;

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
