import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { ApiClientError } from '@/shared/types/api';

import { roomApi } from './roomApi';
import { useJoinRoom } from './roomHooks';
import type { JoinRoomResponse, RoomResponse } from './roomTypes';

vi.mock('./roomApi', () => ({
  roomApi: {
    closeRoom: vi.fn(),
    createRoom: vi.fn(),
    getRecentRooms: vi.fn(),
    getRoom: vi.fn(),
    joinRoom: vi.fn(),
    updateRoom: vi.fn(),
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const room = {
  ...roomFixture.room,
  createdAt: '2026-07-01T10:00:00.000Z',
} satisfies RoomResponse;

const joinedRoom = {
  members: roomFixture.members,
  playbackState: {
    ...roomFixture.playbackState,
    updatedAt: roomFixture.playbackState.updatedAt ?? '2026-07-01T10:12:00.000Z',
  },
  playlist: roomFixture.playlist,
  recentChats: roomFixture.chats,
  room: roomFixture.room,
} satisfies JoinRoomResponse;

describe('useJoinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET으로 inviteCode를 얻은 뒤 POST join을 호출한다', async () => {
    const calls: string[] = [];
    vi.mocked(roomApi.getRoom).mockImplementation(async () => {
      calls.push('getRoom');
      return room;
    });
    vi.mocked(roomApi.joinRoom).mockImplementation(async () => {
      calls.push('joinRoom');
      return joinedRoom;
    });
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls).toEqual(['getRoom', 'joinRoom']);
    expect(roomApi.getRoom).toHaveBeenCalledWith(roomFixture.room.id);
    expect(roomApi.joinRoom).toHaveBeenCalledWith({ inviteCode: roomFixture.room.inviteCode });
    expect(result.current.data).toBe(joinedRoom);
  });

  it('GET 단계가 실패하면 POST join을 호출하지 않는다', async () => {
    const error = new ApiClientError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' }, 404);
    vi.mocked(roomApi.getRoom).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom('unknown-room'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(roomApi.joinRoom).not.toHaveBeenCalled();
  });

  it('참여 이력이 없으면 ROOM_ACCESS_DENIED를 그대로 노출한다', async () => {
    const error = new ApiClientError(
      { code: 'ROOM_ACCESS_DENIED', message: 'Room access denied' },
      403,
    );
    vi.mocked(roomApi.getRoom).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(roomApi.joinRoom).not.toHaveBeenCalled();
  });

  it('POST join 단계 실패를 그대로 노출한다', async () => {
    const error = new ApiClientError({ code: 'ROOM_CLOSED', message: 'Room is closed' }, 403);
    vi.mocked(roomApi.getRoom).mockResolvedValue(room);
    vi.mocked(roomApi.joinRoom).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(roomApi.joinRoom).toHaveBeenCalledWith({ inviteCode: roomFixture.room.inviteCode });
  });
});
