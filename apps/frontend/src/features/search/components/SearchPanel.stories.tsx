import { DocsContainer } from '@storybook/addon-docs/blocks';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import type { ComponentProps, ReactNode } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';

import type { SearchResponse } from '@syfity/shared';

import { searchHandlers } from '@/shared/mocks/handlers/search.handlers';
import type { ApiResponse } from '@/shared/types/api';

import { SearchPanel } from './SearchPanel';

const SEARCH_ENDPOINT = '*/api/v1/search';
const THUMBNAIL_ENDPOINT = 'https://i.ytimg.com/*';
const THUMBNAIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#18181b"/></svg>';
const thumbnailRequestSpy = fn();
const thumbnailHandler = http.get(THUMBNAIL_ENDPOINT, ({ request }) => {
  thumbnailRequestSpy(request.url);

  return HttpResponse.text(THUMBNAIL_SVG, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
});

type StoryRender = () => ReactNode;

function SearchPanelDocsContainer({ children, ...props }: ComponentProps<typeof DocsContainer>) {
  return (
    <DocsContainer {...props}>
      <style>{`
        .sbdocs-content {
          max-width: 1200px;
        }

        .docs-story iframe[src*='features-search-searchpanel--mobile'] {
          display: block;
          width: 375px !important;
          max-width: 100%;
          margin-inline: auto;
        }
      `}</style>
      {children}
    </DocsContainer>
  );
}

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
    docs: {
      container: SearchPanelDocsContainer,
      story: {
        iframeHeight: '640px',
        inline: false,
      },
    },
    layout: 'fullscreen',
    msw: {
      handlers: [...searchHandlers, thumbnailHandler],
    },
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
    await waitFor(() => expect(thumbnailRequestSpy).toHaveBeenCalled());
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: 'mobile', isRotated: false },
  },
  parameters: {
    docs: {
      story: {
        iframeHeight: '812px',
      },
    },
  },
};

export const Loading: Story = {
  args: { initialQuery: 'Loading' },
  parameters: {
    msw: {
      handlers: [
        http.get(SEARCH_ENDPOINT, async () => {
          await delay('infinite');
          return HttpResponse.json({
            success: true,
            data: { items: [] },
          } satisfies SearchResponse);
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
        http.get(SEARCH_ENDPOINT, () =>
          HttpResponse.json({
            success: true,
            data: { items: [] },
          } satisfies SearchResponse),
        ),
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
            } satisfies ApiResponse<SearchResponse['data']>,
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
