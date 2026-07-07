import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LoginErrorBanner } from './LoginErrorBanner';

const meta = {
  title: 'Auth/LoginErrorBanner',
  component: LoginErrorBanner,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-90 overflow-hidden rounded-2xl border border-border bg-surface/76">
        <Story />
        <div className="p-8 text-sm text-muted-foreground">카드 본문 영역</div>
      </div>
    ),
  ],
} satisfies Meta<typeof LoginErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
