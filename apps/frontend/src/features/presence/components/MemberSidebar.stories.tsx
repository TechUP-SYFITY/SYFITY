import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { PresenceMember } from '../presenceStore';
import { MemberSidebar } from './MemberSidebar';

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

const meta = {
  title: 'Features/Presence/MemberSidebar',
  component: MemberSidebar,
  args: { members },
  decorators: [
    (Story) => (
      <div className="flex h-96 w-72 overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MemberSidebar>;

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
