import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ComponentProps } from 'react';

import { SearchInput } from './SearchInput';

const meta = {
  title: 'features/search/SearchInput',
  component: SearchInput,
  parameters: {
    layout: 'centered',
  },
  args: {
    query: 'Coldplay',
    isLoading: false,
  },
} satisfies Meta<typeof SearchInput>;

export default meta;

type Story = StoryObj<typeof meta>;

function SearchInputPreview(args: ComponentProps<typeof SearchInput>) {
  const [query, setQuery] = useState(args.query);

  return (
    <div className="w-[min(448px,calc(100vw-32px))] bg-white p-4">
      <SearchInput {...args} query={query} onQueryChange={setQuery} />
    </div>
  );
}

export const Default: Story = {
  render: (args) => <SearchInputPreview {...args} />,
};

export const Loading: Story = {
  args: {
    query: 'Coldplay',
    isLoading: true,
  },
  render: (args) => <SearchInputPreview {...args} />,
};
