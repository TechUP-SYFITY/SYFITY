import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'gradient', 'ghost', 'primary-soft', 'accent-soft', 'destructive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    isLoading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: { children: '버튼', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function EnterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const Primary: Story = { args: { variant: 'primary', children: '입장' } };
export const Gradient: Story = { args: { variant: 'gradient', children: '방 만들기' } };
export const Ghost: Story = { args: { variant: 'ghost', children: '팔로우' } };
export const PrimarySoft: Story = { args: { variant: 'primary-soft', children: '추가' } };
export const AccentSoft: Story = { args: { variant: 'accent-soft', children: '초대하기' } };
export const Destructive: Story = { args: { variant: 'destructive', children: '삭제' } };

export const WithIcon: Story = {
  args: {
    variant: 'gradient',
    children: (
      <>
        <PlusIcon />방 만들기
      </>
    ),
  },
};

export const Loading: Story = { args: { isLoading: true, children: '입장' } };
export const Disabled: Story = { args: { disabled: true, children: '입장' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">입장</Button>
      <Button variant="gradient">방 만들기</Button>
      <Button variant="ghost">팔로우</Button>
      <Button variant="primary-soft">추가</Button>
      <Button variant="accent-soft">초대하기</Button>
      <Button variant="destructive">삭제</Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: { className: 'w-full', variant: 'gradient', children: '방으로 입장하기' },
  parameters: { layout: 'padded' },
  decorators: [(Story) => <div className="w-80">{Story()}</div>],
};

export const AsChildLink: Story = {
  render: () => (
    <Button asChild variant="gradient">
      <a href="#">방으로 입장하기</a>
    </Button>
  ),
};

export const EmptyStateActions: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="gradient" size="sm">
        <PlusIcon />방 만들기
      </Button>
      <Button variant="ghost" size="sm">
        <EnterIcon />
        코드 입장
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="추가">
        <PlusIcon />
      </Button>
    </div>
  ),
};
