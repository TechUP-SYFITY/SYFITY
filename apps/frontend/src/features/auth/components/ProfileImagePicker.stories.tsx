import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ProfileImagePicker } from './ProfileImagePicker';

function withQueryClient() {
  return function QueryClientDecorator(Story: () => ReactNode) {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <div className="w-96 rounded-2xl border border-border bg-card p-6">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Auth/ProfileImagePicker',
  component: ProfileImagePicker,
  parameters: { layout: 'centered' },
  decorators: [withQueryClient()],
  args: { nickname: '민지', currentImage: null },
} satisfies Meta<typeof ProfileImagePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithProfileImage: Story = {
  args: { currentImage: 'https://i.pravatar.cc/160?img=47' },
};
