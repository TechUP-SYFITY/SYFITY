import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SearchResultItem } from './SearchResultItem';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';

const meta = {
  title: 'features/search/SearchResultItem',
  component: SearchResultItem,
  parameters: {
    layout: 'centered',
  },
  args: {
    video: MOCK_SEARCH_RESULTS[0],
    isAdded: false,
  },
} satisfies Meta<typeof SearchResultItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onAdd: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[min(448px,calc(100vw-32px))] bg-white p-4">
        <Story />
      </div>
    ),
  ],
};

export const Added: Story = {
  args: {
    isAdded: true,
    onAdd: () => undefined,
  },
  decorators: Default.decorators,
};
