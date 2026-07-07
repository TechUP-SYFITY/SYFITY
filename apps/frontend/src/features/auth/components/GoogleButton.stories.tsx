import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { GoogleButton } from './GoogleButton';

const meta = {
  title: 'Auth/GoogleButton',
  component: GoogleButton,
  parameters: { layout: 'centered' },
  args: { returnUrl: undefined },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GoogleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithReturnUrl: Story = {
  args: { returnUrl: '/room/join?code=ABC123' },
};
