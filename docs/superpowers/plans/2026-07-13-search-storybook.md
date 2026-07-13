# SearchPanel Storybook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic desktop and mobile `SearchPanel` stories under `Features/Search/SearchPanel` without changing production behavior.

**Architecture:** A single colocated CSF story file wraps `SearchPanel` in a fresh React Query client and uses the existing global MSW search handler for the normal result. Story-level MSW overrides provide loading, empty, and error states, while Storybook viewport globals provide a 375 x 812 mobile presentation.

**Tech Stack:** React 19, TypeScript, Storybook 10 CSF, TanStack Query 5, MSW 2, Vitest browser mode, Playwright Chromium

## Global Constraints

- Create only `apps/frontend/src/features/search/components/SearchPanel.stories.tsx` for product-facing work.
- Keep `SearchAddToast`, production components, APIs, Storybook configuration, and dependencies unchanged.
- Use `Features/Search/SearchPanel` as the Storybook title.
- Include `Default`, `Mobile`, `Loading`, `Empty`, `Error`, and `LinkInput` stories.
- Use a 375 x 812 viewport for `Mobile`.
- Do not make live YouTube or backend requests.

---

### Task 1: Add the SearchPanel story catalog

**Files:**

- Create: `apps/frontend/src/features/search/components/SearchPanel.stories.tsx`

**Interfaces:**

- Consumes: `SearchPanel`, the project Storybook preview providers, `@tanstack/react-query`, MSW, and `storybook/test`.
- Produces: Storybook metadata at `Features/Search/SearchPanel` and six named story exports.

- [ ] **Step 1: Confirm the story does not exist yet**

Run:

```powershell
Test-Path apps/frontend/src/features/search/components/SearchPanel.stories.tsx
```

Expected: `False`.

- [ ] **Step 2: Create the story with deterministic state tests**

Create `apps/frontend/src/features/search/components/SearchPanel.stories.tsx` with:

```tsx
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
```

- [ ] **Step 3: Format and lint the new story**

Run:

```powershell
pnpm --filter frontend exec prettier --write src/features/search/components/SearchPanel.stories.tsx
pnpm --filter frontend exec eslint src/features/search/components/SearchPanel.stories.tsx
```

Expected: both commands exit with code 0.

- [ ] **Step 4: Run the generated Storybook browser tests**

Run:

```powershell
pnpm --filter frontend test --project=storybook src/features/search/components/SearchPanel.stories.tsx --run
```

Expected: the six stories run in Chromium and all play assertions pass.

- [ ] **Step 5: Run type checking and build Storybook**

Run:

```powershell
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend build-storybook
```

Expected: both commands exit with code 0 and the build indexes `Features/Search/SearchPanel`.

- [ ] **Step 6: Check the development server**

Check whether port 6006 is listening and whether the new story index is available. If the existing process does not discover the story, stop only that port's owning process and restart Storybook from `apps/frontend` with `pnpm storybook`.

- [ ] **Step 7: Review and commit only the story change**

Run:

```powershell
git diff --check
git diff -- apps/frontend/src/features/search/components/SearchPanel.stories.tsx
git add apps/frontend/src/features/search/components/SearchPanel.stories.tsx
git commit -m "test: SearchPanel Storybook 스토리 추가"
```

Expected: the commit contains only the new SearchPanel story file.
