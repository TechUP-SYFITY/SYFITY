import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { OnboardingForm } from './OnboardingForm';

function withQueryClient() {
  return function QueryClientDecorator(Story: () => ReactNode) {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-180 bg-background px-5 py-12">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Auth/OnboardingForm',
  component: OnboardingForm,
  parameters: { layout: 'fullscreen' },
  decorators: [withQueryClient()],
} satisfies Meta<typeof OnboardingForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
