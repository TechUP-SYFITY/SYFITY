import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LoginCard } from './LoginCard';

const meta = {
  title: 'Auth/LoginCard',
  component: LoginCard,
  parameters: { layout: 'centered' },
  args: { returnUrl: undefined, hasError: false },
} satisfies Meta<typeof LoginCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: { hasError: true },
};
