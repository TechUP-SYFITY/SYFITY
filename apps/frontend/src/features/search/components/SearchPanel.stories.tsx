import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, fn, within } from 'storybook/test';

import { SearchPanel } from './SearchPanel';

const SEARCH_ENDPOINT = '*/api/v1/search';

type StoryRender = () => ReactNode;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function withSearchStoryFrame() {
  return function SearchStoryFrameDecorator(Story: StoryRender) {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <Story />
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Features/Search/SearchPanel',
  component: SearchPanel,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
      },
    },
  },
  args: {
    initialQuery: 'Night',
    isOpen: true,
    onAddResult: fn(),
    onAddUrl: fn(),
    onClose: fn(),
    roomName: 'Chill Night',
  },
  decorators: [withSearchStoryFrame()],
} satisfies Meta<typeof SearchPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);

    await expect(page.findByRole('dialog', { name: '곡 추가' })).resolves.toBeInTheDocument();
    await expect(page.findByText('Night Changes')).resolves.toBeInTheDocument();
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile', isRotated: false },
  },
};

export const Loading: Story = {
  args: { initialQuery: 'Loading' },
  parameters: {
    msw: {
      handlers: [
        http.get(SEARCH_ENDPOINT, async () => {
          await delay('infinite');
          return HttpResponse.json({ success: true, data: { items: [] } });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.findByText('검색 중이에요')).resolves.toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { initialQuery: 'No matching video' },
  parameters: {
    msw: {
      handlers: [
        http.get(SEARCH_ENDPOINT, () => HttpResponse.json({ success: true, data: { items: [] } })),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.findByText('검색 결과가 없어요')).resolves.toBeInTheDocument();
  },
};

export const Error: Story = {
  args: { initialQuery: 'Search error' },
  parameters: {
    msw: {
      handlers: [
        http.get(SEARCH_ENDPOINT, () =>
          HttpResponse.json(
            {
              success: false,
              error: {
                code: 'SERVER_YOUTUBE_API_ERROR',
                message: 'YouTube 검색 요청에 실패했어요',
              },
            },
            { status: 502 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(page.findByText('검색에 실패했어요')).resolves.toBeInTheDocument();
  },
};

export const LinkInput: Story = {
  args: { initialQuery: 'https://youtu.be/syFZfO_wfMQ' },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(
      page.findByText('이 링크를 플레이리스트에 추가할까요?'),
    ).resolves.toBeInTheDocument();
  },
};
