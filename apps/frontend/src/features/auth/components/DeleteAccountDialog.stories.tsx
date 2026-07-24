import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { DeleteAccountDialog } from './DeleteAccountDialog';

function withQueryClient() {
  return function QueryClientDecorator(Story: () => ReactNode) {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-100 bg-background p-8">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Auth/DeleteAccountDialog',
  component: DeleteAccountDialog,
  parameters: { layout: 'fullscreen' },
  decorators: [withQueryClient()],
} satisfies Meta<typeof DeleteAccountDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
