import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Badge } from './Badge';

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['muted', 'primary', 'accent', 'warning', 'live'] },
    dot: { control: 'boolean' },
  },
  args: { children: 'Badge', variant: 'primary' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Primary: Story = { args: { variant: 'primary', children: 'Now Playing' } };
export const Accent: Story = { args: { variant: 'accent', children: '방 만들기' } };
export const Muted: Story = { args: { variant: 'muted', children: '팔로워 1.2k' } };
export const Live: Story = { args: { variant: 'live', dot: true, children: 'LIVE' } };
export const Warning: Story = { args: { variant: 'warning', children: '대기 중' } };

export const AllBadges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="primary">Now Playing</Badge>
      <Badge variant="accent">방 만들기</Badge>
      <Badge variant="muted">팔로워 1.2k</Badge>
      <Badge variant="live" dot>
        LIVE
      </Badge>
      <Badge variant="primary">
        <TrendIcon />
        인기
      </Badge>
      <Badge variant="accent">
        <TrendIcon />
        추천
      </Badge>
    </div>
  ),
};
