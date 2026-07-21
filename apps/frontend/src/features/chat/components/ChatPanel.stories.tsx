import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRef, type ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import type { ChatMessage } from '@/shared/types/domain';

import { ChatPanel } from './ChatPanel';
import type { UseChatScrollResult } from '../hooks/useChatScroll';
import { useChatStore } from '../store/chatStore';

const roomId = 'story-room';

const messages: ChatMessage[] = [
  {
    createdAt: '2026-07-01T10:12:00.000Z',
    id: 'story-chat-1',
    message: '안녕하세요. 오늘 플레이리스트 기대돼요.',
    nickname: '민지',
    profileImage: null,
    type: 'user',
    userId: 'story-host',
  },
  {
    createdAt: '2026-07-01T10:13:00.000Z',
    id: 'story-chat-system-1',
    message: 'Host가 재생을 시작했습니다.',
    nickname: null,
    profileImage: null,
    type: 'system',
    userId: null,
  },
  {
    createdAt: '2026-07-01T10:14:00.000Z',
    id: 'story-chat-2',
    message: 'Night Changes 진짜 최고예요.',
    nickname: '지민',
    profileImage: null,
    type: 'user',
    userId: 'story-member-1',
  },
];
const systemMessage = messages[1] as ChatMessage;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

type StoryRender = () => ReactNode;

function withChatStoryFrame() {
  return function ChatStoryFrameDecorator(Story: StoryRender) {
    useChatStore.getState().clearMessages();

    return (
      <QueryClientProvider client={createQueryClient()}>
        <div className="h-96 w-80 overflow-hidden border border-border bg-background">
          <Story />
        </div>
      </QueryClientProvider>
    );
  };
}

function createStoryChatScrollResult(
  override: Partial<UseChatScrollResult> = {},
): UseChatScrollResult {
  return {
    hasNextPage: false,
    isFetchingNextPage: false,
    isHistoryError: false,
    isScrollToBottomButtonVisible: false,
    retryLoadOlderMessages: () => undefined,
    scrollContainerRef: createRef<HTMLDivElement>(),
    scrollToBottomNow: () => undefined,
    topSentinelRef: createRef<HTMLDivElement>(),
    ...override,
  };
}

const meta = {
  title: 'Features/Chat/ChatPanel',
  component: ChatPanel,
  parameters: {
    layout: 'centered',
    msw: { handlers: [] },
  },
  args: {
    currentUserName: '민지',
    currentUserProfileImage: null,
    messages,
    roomId,
  },
  decorators: [withChatStoryFrame()],
} satisfies Meta<typeof ChatPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('민지')).resolves.toBeInTheDocument();
    await expect(canvas.findByText('Host가 재생을 시작했습니다.')).resolves.toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    messages: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.queryByText('민지')).toBeNull();
    await expect(canvas.getByLabelText('채팅 메시지 입력')).toBeInTheDocument();
  },
};

export const SystemOnly: Story = {
  args: {
    messages: [systemMessage],
  },
};

export const LoadingOlderMessages: Story = {
  render: (args) => (
    <ChatPanel
      {...args}
      chatScrollResult={createStoryChatScrollResult({ isFetchingNextPage: true })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('이전 메시지를 불러오는 중...')).resolves.toBeInTheDocument();
  },
};

export const HistoryLoadError: Story = {
  render: (args) => (
    <ChatPanel {...args} chatScrollResult={createStoryChatScrollResult({ isHistoryError: true })} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByText('이전 메시지를 불러오지 못했어요.'),
    ).resolves.toBeInTheDocument();
    await expect(canvas.findByRole('button', { name: /다시 시도/ })).resolves.toBeInTheDocument();
  },
};

export const ScrollToBottomVisible: Story = {
  render: (args) => (
    <ChatPanel
      {...args}
      chatScrollResult={createStoryChatScrollResult({ isScrollToBottomButtonVisible: true })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByRole('button', { name: '맨 아래로 이동' }),
    ).resolves.toBeInTheDocument();
  },
};
