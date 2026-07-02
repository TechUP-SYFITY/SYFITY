import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, type ComponentProps } from 'react';

import { SearchPanel } from './SearchPanel';
import { MOCK_SEARCH_RESULTS } from '../data/mockSearchResults';
import { SEARCH_RESULT_STATUS } from '../types/search';

const meta = {
  title: 'features/search/SearchPanel',
  component: SearchPanel,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    roomName: 'Chill Night',
    query: 'Coldplay',
    status: SEARCH_RESULT_STATUS.success,
    results: MOCK_SEARCH_RESULTS,
    onClose: () => undefined,
    onQueryChange: () => undefined,
    onAdd: () => undefined,
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function SearchPanelPreview(args: ComponentProps<typeof SearchPanel>) {
  const [open, setOpen] = useState(args.open);
  const [query, setQuery] = useState(args.query);

  return (
    <div className="min-h-dvh bg-zinc-950/20">
      <SearchPanel
        {...args}
        open={open}
        query={query}
        onClose={() => setOpen(false)}
        onQueryChange={setQuery}
        onAdd={() => undefined}
      />
    </div>
  );
}

export const Desktop: Story = {
  render: (args) => <SearchPanelPreview {...args} />,
};

export const MobileEmpty: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.empty,
    results: [],
    query: 'Colplda',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: (args) => <SearchPanelPreview {...args} />,
};

export const Loading: Story = {
  args: {
    status: SEARCH_RESULT_STATUS.loading,
    results: [],
  },
  render: (args) => <SearchPanelPreview {...args} />,
};
