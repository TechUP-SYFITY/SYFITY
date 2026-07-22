import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { NicknameEditor } from './NicknameEditor';

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
  title: 'Auth/NicknameEditor',
  component: NicknameEditor,
  parameters: { layout: 'centered' },
  decorators: [withQueryClient()],
  args: { initialNickname: '민지' },
} satisfies Meta<typeof NicknameEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongNickname: Story = {
  args: { initialNickname: '새벽 드라이브를 좋아하는 민지' },
};
