import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ApiClientError } from '@/shared/types/api';

import { JoinRoomDialog } from './JoinRoomDialog';
import type { RoomApi } from '../api/roomApi';

type RoomApiOverride = Partial<RoomApi>;
type StoryRender = () => ReactNode;

const joinedRoomData = {
  room: {
    id: 'story-room',
    name: 'Chill Night',
    status: 'active' as const,
    inviteCode: '3F9A2C',
    hostId: 'story-host',
    createdAt: new Date().toISOString(),
  },
  playbackState: {
    videoId: null,
    playlistItemId: null,
    currentTime: 0,
    isPlaying: false,
    updatedAt: new Date().toISOString(),
  },
  playlist: [],
  members: [],
  recentChats: [],
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createPendingPromise<T>() {
  return new Promise<T>(() => undefined);
}

function createRoomApiMock(apiOverride: RoomApiOverride = {}): RoomApi {
  return {
    createRoomMembership: async () => ({ room: joinedRoomData.room }),
    createRoom: async () => ({
      id: 'story-room',
      name: 'Chill Night',
      inviteCode: '3F9A2C',
      status: 'active',
      createdAt: new Date().toISOString(),
    }),
    getMyRooms: async () => ({ rooms: [] }),
    getRecentRooms: async () => ({ rooms: [] }),
    getRoom: async () => joinedRoomData.room,
    updateRoom: async () => ({
      id: 'story-room',
      name: 'Chill Night',
      status: 'active',
      closedAt: null,
      updatedAt: new Date().toISOString(),
    }),
    ...apiOverride,
  };
}

function withDialogStoryFrame() {
  return function DialogStoryFrameDecorator(Story: StoryRender) {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <Story />
      </QueryClientProvider>
    );
  };
}

async function submitCode(canvasElement: HTMLElement, code = 'XK29ZQ') {
  const canvas = within(canvasElement.ownerDocument.body);
  const input = canvas.getByLabelText('초대 코드');

  await userEvent.clear(input);
  await userEvent.type(input, code);
  await userEvent.click(canvas.getByRole('button', { name: /입장하기|다시 시도/ }));

  return canvas;
}

const meta = {
  title: 'Features/Room/JoinRoomDialog',
  component: JoinRoomDialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onOpenChange: fn(),
    roomApiClient: createRoomApiMock(),
  },
  decorators: [withDialogStoryFrame()],
} satisfies Meta<typeof JoinRoomDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LinkFilled: Story = {
  args: {
    initialCode: '3F9A2C',
  },
};

export const Loading: Story = {
  args: {
    roomApiClient: createRoomApiMock({
      createRoomMembership: () => createPendingPromise(),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitCode(canvasElement);

    await expect(canvas.findByText('방에 입장하는 중...')).resolves.toBeInTheDocument();
  },
};

export const InvalidCode: Story = {
  args: {
    roomApiClient: createRoomApiMock({
      createRoomMembership: async () => {
        throw new ApiClientError({ code: 'ROOM_NOT_FOUND', message: 'invalid invite code' }, 404);
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitCode(canvasElement);

    await expect(
      canvas.findByText('유효하지 않은 초대 코드예요. 다시 확인해주세요.'),
    ).resolves.toBeInTheDocument();
  },
};

export const ClosedRoom: Story = {
  args: {
    roomApiClient: createRoomApiMock({
      createRoomMembership: async () => {
        throw new ApiClientError({ code: 'ROOM_CLOSED', message: 'room closed' }, 403);
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitCode(canvasElement);

    await expect(canvas.findByText('이미 종료된 방이에요')).resolves.toBeInTheDocument();
  },
};

export const InactiveRoom: Story = {
  args: {
    roomApiClient: createRoomApiMock({
      createRoomMembership: async () => {
        throw new ApiClientError({ code: 'ROOM_INACTIVE', message: 'room inactive' }, 403);
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = await submitCode(canvasElement);

    await expect(canvas.findByText('입장할 수 없는 방이에요')).resolves.toBeInTheDocument();
  },
};
