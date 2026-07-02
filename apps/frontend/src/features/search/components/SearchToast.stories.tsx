import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SearchToast } from './SearchToast';

const meta = {
  title: 'features/search/SearchToast',
  component: SearchToast,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  args: {
    onDismiss: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-[180px] w-[min(452px,100vw)] items-center justify-center bg-[#09090b] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchToast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    toast: {
      type: 'error',
      message: '유효하지 않은 링크예요. YouTube 링크를 붙여넣어 주세요.',
    },
  },
};

export const Success: Story = {
  args: {
    toast: {
      type: 'success',
      message: '플레이리스트에 추가했어요 🎵',
    },
  },
};
