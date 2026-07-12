import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import type { ChatMessage } from '@/shared/types/domain';

import { useChatStore } from '../chatStore';
import { ChatHistoryStatus } from './ChatHistoryStatus';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatPanel } from './ChatPanel';
import { ChatSystemMessage } from './ChatSystemMessage';
import { ScrollToBottomButton } from './ScrollToBottomButton';

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
type VisualHistoryState = 'error' | 'idle' | 'loading';

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

function ChatPanelVisualState({
  historyState = 'idle',
  messages: storyMessages = messages,
  showScrollToBottomButton = false,
}: {
  historyState?: VisualHistoryState;
  messages?: ChatMessage[];
  showScrollToBottomButton?: boolean;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="hidden h-12 shrink-0 items-center border-b border-border px-4 xl:flex">
        <h2 className="text-xs font-semibold text-muted-foreground">채팅</h2>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="h-full min-h-0 scrollbar-none overflow-y-auto px-6 py-5">
          <div className="flex min-h-full flex-col justify-end gap-4">
            <ChatHistoryStatus
              isLoading={historyState === 'loading'}
              isError={historyState === 'error'}
              onRetry={() => undefined}
            />
            {storyMessages.map((chat) =>
              chat.type === 'system' ? (
                <ChatSystemMessage key={chat.id} chat={chat} />
              ) : (
                <ChatMessageItem key={chat.id} chat={chat} />
              ),
            )}
          </div>
        </div>
        <ScrollToBottomButton isVisible={showScrollToBottomButton} onClick={() => undefined} />
      </div>
      <div className="flex shrink-0 items-start gap-3 border-t border-border px-5 py-3 xl:gap-2 xl:p-4">
        <ChatInputForm onSubmit={() => undefined} />
      </div>
    </aside>
  );
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
  render: (args) => <ChatPanelVisualState messages={args.messages} historyState="loading" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText('이전 메시지를 불러오는 중...')).resolves.toBeInTheDocument();
  },
};

export const HistoryLoadError: Story = {
  render: (args) => <ChatPanelVisualState messages={args.messages} historyState="error" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByText('이전 메시지를 불러오지 못했어요.'),
    ).resolves.toBeInTheDocument();
    await expect(canvas.findByRole('button', { name: /다시 시도/ })).resolves.toBeInTheDocument();
  },
};

export const ScrollToBottomVisible: Story = {
  render: (args) => <ChatPanelVisualState messages={args.messages} showScrollToBottomButton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByRole('button', { name: '맨 아래로 이동' }),
    ).resolves.toBeInTheDocument();
  },
};
