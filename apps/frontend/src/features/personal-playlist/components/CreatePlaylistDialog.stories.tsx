// 생성/수정 겸용 폼의 모드별 상태와 유효성·실패 처리를 재현한다. (docs/15 §9)
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

const API = '*/api/v1';

const existing: PersonalPlaylistSummary = {
  createdAt: '2026-07-18T10:00:00.000Z',
  id: 'pl-night-drive',
  name: '밤 드라이브',
  updatedAt: '2026-07-20T12:00:00.000Z',
};

const createSuccess = http.post(`${API}/personal-playlists`, () =>
  HttpResponse.json({ success: true, data: existing }, { status: 201 }),
);

const updateSuccess = http.patch(`${API}/personal-playlists/:id`, () =>
  HttpResponse.json({ success: true, data: existing }),
);

type StoryRender = () => ReactNode;

function withDialogFrame() {
  return function DialogFrameDecorator(Story: StoryRender) {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-150 bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

const meta = {
  title: 'Features/PersonalPlaylist/CreatePlaylistDialog',
  component: CreatePlaylistDialog,
  parameters: {
    layout: 'fullscreen',
    msw: { handlers: [createSuccess, updateSuccess] },
  },
  args: {
    open: true,
    onOpenChange: () => undefined,
  },
  decorators: [withDialogFrame()],
} satisfies Meta<typeof CreatePlaylistDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 생성 모드 — 빈 폼, 제출 버튼은 비활성으로 시작한다. */
export const Create: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await expect(body.getByRole('button', { name: '만들기' })).toBeDisabled();
  },
};

/** 이름을 입력하면 제출이 활성화된다. */
export const CreateFilled: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByLabelText(/이름/), '새벽 드라이브');

    await expect(body.getByRole('button', { name: '만들기' })).toBeEnabled();
  },
};

/** 공백만 입력하면 여전히 제출할 수 없다. */
export const CreateWhitespaceOnly: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByLabelText(/이름/), '   ');

    await expect(body.getByRole('button', { name: '만들기' })).toBeDisabled();
  },
};

/** 수정 모드 — 기존 값이 채워지고 버튼 문구가 "저장"으로 바뀐다. */
export const Edit: Story = {
  args: { playlist: existing },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await expect(body.getByLabelText(/이름/)).toHaveValue('밤 드라이브');
    await expect(body.getByRole('button', { name: '저장' })).toBeInTheDocument();
  },
};

/** 저장 실패 시 인라인 에러 문구를 보여준다. */
export const SaveError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post(`${API}/personal-playlists`, () =>
          HttpResponse.json(
            { success: false, error: { code: 'SERVER_INTERNAL_ERROR', message: 'boom' } },
            { status: 500 },
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.type(body.getByLabelText(/이름/), '실패할 리스트');
    await userEvent.click(body.getByRole('button', { name: '만들기' }));

    await expect(
      await body.findByText('저장에 실패했어요. 다시 시도해 주세요.'),
    ).toBeInTheDocument();
  },
};
