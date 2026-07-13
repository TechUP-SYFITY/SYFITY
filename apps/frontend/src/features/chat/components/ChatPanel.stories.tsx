import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import type { ChatMessage } from '@/shared/types/domain';

import { ChatPanel } from './ChatPanel';

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

const meta = {
  title: 'Features/Chat/ChatPanel',
  component: ChatPanel,
  parameters: {
    layout: 'centered',
  },
  args: {
    currentUserName: '민지',
    currentUserProfileImage: null,
    messages,
    roomId,
  },
  decorators: [
    (Story) => (
      <div className="h-96 w-80 overflow-hidden border border-border bg-background">
        <Story />
      </div>
    ),
  ],
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
