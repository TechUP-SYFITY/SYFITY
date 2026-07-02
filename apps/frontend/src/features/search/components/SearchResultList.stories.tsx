import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SearchResultList } from './SearchResultList';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';
import { SEARCH_RESULT_STATUS } from '../types/search';

const meta = {
  title: 'features/search/SearchResultList',
  component: SearchResultList,
  parameters: {
    layout: 'centered',
  },
  args: {
    status: SEARCH_RESULT_STATUS.success,
    results: MOCK_SEARCH_RESULTS,
    query: 'Coldplay',
    onAdd: () => undefined,
  },
  decorators: [
    (Story) => (
      <div className="w-[min(448px,calc(100vw-32px))] bg-white p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchResultList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Loading: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.loading,
    results: [],
  },
};

export const Empty: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.empty,
    results: [],
    query: 'Colplda',
  },
};

export const Idle: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.idle,
    results: [],
    query: '',
  },
};

export const Error: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.error,
    results: [],
    errorMessage: '네트워크 상태를 확인하고 다시 시도해 주세요.',
  },
};
