// 불러오기 다이얼로그의 목록 상태와 결과 안내 3케이스를 재현한다. (docs/15 §9)
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';

import { ImportToRoomDialog } from './ImportToRoomDialog';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

const API = '*/api/v1';

const summary = (id: string, name: string, itemCount: number): PersonalPlaylistSummary => ({
  coverUrl: null,
  description: null,
  id,
  itemCount,
  name,
  totalDuration: itemCount * 220,
  updatedAt: '2026-07-20T12:00:00.000Z',
});

const playlists = [
  summary('pl-night-drive', '밤 드라이브', 12),
  summary('pl-focus-lofi', '집중 로파이', 8),
  summary('pl-empty', '아직 비어있는 리스트', 0),
];

const listHandler = (data: PersonalPlaylistSummary[]) =>
  http.get(`${API}/personal-playlists`, () =>
    HttpResponse.json({ success: true, data: { playlists: data } }),
  );

const importHandler = (data: {
  addedCount: number;
  duplicateCount: number;
  unavailableCount: number;
}) =>
  http.post(`${API}/rooms/:roomId/playlist-imports`, () =>
    HttpResponse.json({ success: true, data }),
  );

type StoryRender = () => ReactNode;

function withDialogFrame() {
  return function DialogFrameDecorator(Story: StoryRender) {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    return (
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-150 bg-background">
            <Story />
          </div>
        </QueryClientProvider>
      </ToastProvider>
    );
  };
}

/** 첫 번째 곡 있는 리스트를 골라 "끝에 추가"까지 누른다. */
async function importFirstPlaylist(canvasElement: HTMLElement) {
  const body = within(canvasElement.ownerDocument.body);

  await userEvent.click(await body.findByRole('button', { name: /밤 드라이브/ }));
  await userEvent.click(body.getByRole('button', { name: /끝에 추가/ }));
}

const meta = {
  title: 'Features/PersonalPlaylist/ImportToRoomDialog',
  component: ImportToRoomDialog,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [listHandler(playlists)] },
  },
  args: {
    open: true,
    onOpenChange: () => undefined,
    roomId: 'story-room',
  },
  decorators: [withDialogFrame()],
} satisfies Meta<typeof ImportToRoomDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [http.get(`${API}/personal-playlists`, () => new Promise(() => undefined))],
    },
  },
};

/** 플레이리스트가 하나도 없을 때 — 그 자리에서 생성하도록 유도한다. */
export const NoPlaylists: Story = {
  parameters: { msw: { handlers: [listHandler([])] } },
};

/** 리스트는 있지만 전부 0곡이라 고를 수 있는 항목이 없을 때. */
export const AllPlaylistsEmpty: Story = {
  parameters: {
    msw: {
      handlers: [
        listHandler([summary('pl-a', '빈 리스트 A', 0), summary('pl-b', '빈 리스트 B', 0)]),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await expect(await body.findByRole('button', { name: /빈 리스트 A/ })).toBeDisabled();
    await expect(body.getByRole('button', { name: /끝에 추가/ })).toBeDisabled();
  },
};

/** 결과 ①: 스킵 없이 전부 추가. */
export const ResultAllAdded: Story = {
  parameters: {
    msw: {
      handlers: [
        listHandler(playlists),
        importHandler({ addedCount: 12, duplicateCount: 0, unavailableCount: 0 }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await importFirstPlaylist(canvasElement);

    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText('12곡 추가')).toBeInTheDocument();
  },
};

/** 결과 ②: 중복·재생불가로 일부 스킵. */
export const ResultPartiallySkipped: Story = {
  parameters: {
    msw: {
      handlers: [
        listHandler(playlists),
        importHandler({ addedCount: 9, duplicateCount: 2, unavailableCount: 1 }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await importFirstPlaylist(canvasElement);

    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByText('9곡 추가 · 중복 2 · 재생불가 1 건너뜀'),
    ).toBeInTheDocument();
  },
};

/** 결과 ③: 추가된 곡이 0건. */
export const ResultNothingAdded: Story = {
  parameters: {
    msw: {
      handlers: [
        listHandler(playlists),
        importHandler({ addedCount: 0, duplicateCount: 11, unavailableCount: 1 }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await importFirstPlaylist(canvasElement);

    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByText('추가할 새 곡이 없어요 (중복 11 · 재생불가 1)'),
    ).toBeInTheDocument();
  },
};

/** 불러오기 요청 자체가 실패한 경우 — 인라인 에러. */
export const ImportError: Story = {
  parameters: {
    msw: {
      handlers: [
        listHandler(playlists),
        http.post(`${API}/rooms/:roomId/playlist-imports`, () =>
          HttpResponse.json(
            { success: false, error: { code: 'SERVER_INTERNAL_ERROR', message: 'boom' } },
            { status: 500 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await importFirstPlaylist(canvasElement);

    const body = within(canvasElement.ownerDocument.body);
    await expect(
      await body.findByText('불러오기에 실패했어요. 다시 시도해 주세요.'),
    ).toBeInTheDocument();
  },
};
