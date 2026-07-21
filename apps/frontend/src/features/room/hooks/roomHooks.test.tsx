import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocketClient, SyfitySocket } from '@/shared/lib/socket/types';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { ApiClientError } from '@/shared/types/api';

import { useCloseRoom, useJoinRoom, useJoinRoomByCode, useLeaveRoom } from './roomHooks';
import { roomApi } from '../api/roomApi';
import type { CreateRoomMembershipResponse, RoomResponse } from '../types/roomTypes';

vi.mock('../api/roomApi', () => ({
  roomApi: {
    createRoomMembership: vi.fn(),
    createRoom: vi.fn(),
    getRecentRooms: vi.fn(),
    getRoom: vi.fn(),
    updateRoom: vi.fn(),
  },
}));

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const room = {
  ...roomFixture.room,
  createdAt: '2026-07-01T10:00:00.000Z',
} satisfies RoomResponse;

const membership = { room: roomFixture.room } satisfies CreateRoomMembershipResponse;

describe('Room membership hooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Room id 입장은 invite code를 조회한 뒤 room-membership을 생성한다', async () => {
    vi.mocked(roomApi.getRoom).mockResolvedValue(room);
    vi.mocked(roomApi.createRoomMembership).mockResolvedValue(membership);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roomApi.createRoomMembership).toHaveBeenCalledWith({
      inviteCode: roomFixture.room.inviteCode,
    });
    expect(result.current.data).toEqual(membership);
  });

  it('초대 코드 입장은 membership API 오류를 그대로 노출한다', async () => {
    const error = new ApiClientError({ code: 'ROOM_CLOSED', message: 'Room is closed' }, 403);
    vi.mocked(roomApi.createRoomMembership).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoomByCode(roomFixture.room.inviteCode), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  it('Room 조회 실패 시 membership 생성 요청을 보내지 않는다', async () => {
    const error = new ApiClientError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' }, 404);
    vi.mocked(roomApi.getRoom).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
    expect(roomApi.createRoomMembership).not.toHaveBeenCalled();
  });

  it('초대 코드 입장은 ROOM_ACCESS_DENIED 오류를 그대로 노출한다', async () => {
    const error = new ApiClientError({ code: 'ROOM_ACCESS_DENIED', message: 'Access denied' }, 403);
    vi.mocked(roomApi.createRoomMembership).mockRejectedValue(error);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useJoinRoomByCode(roomFixture.room.inviteCode), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });

  it('빈 초대 코드는 요청하지 않고, 값이 생기면 refetch할 수 있다', async () => {
    vi.mocked(roomApi.createRoomMembership).mockResolvedValue(membership);
    const queryClient = createQueryClient();
    const { result, rerender } = renderHook(({ inviteCode }) => useJoinRoomByCode(inviteCode), {
      initialProps: { inviteCode: '' },
      wrapper: createWrapper(queryClient),
    });

    expect(roomApi.createRoomMembership).not.toHaveBeenCalled();

    rerender({ inviteCode: roomFixture.room.inviteCode });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roomApi.createRoomMembership).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });
    expect(roomApi.createRoomMembership).toHaveBeenCalledTimes(2);
  });

  it('Room 종료는 PATCH에 status: closed를 전달한다', async () => {
    vi.mocked(roomApi.updateRoom).mockResolvedValue({
      id: roomFixture.room.id,
      name: roomFixture.room.name,
      status: 'closed',
      closedAt: '2026-07-19T12:00:00.000Z',
      updatedAt: '2026-07-19T12:00:00.000Z',
    });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useCloseRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(roomApi.updateRoom).toHaveBeenCalledWith(roomFixture.room.id, { status: 'closed' });
  });

  it('연결된 Socket으로 Member의 명시적 퇴장을 전송한다', () => {
    const emit = vi.fn();
    const socket = {
      connected: true,
      emit,
    } as unknown as SyfitySocket;
    const client = {
      get: vi.fn(() => socket),
    } as unknown as SocketClient;
    const { result } = renderHook(() => useLeaveRoom(roomFixture.room.id, client));

    expect(result.current()).toBe(true);
    expect(emit).toHaveBeenCalledWith('room:leave', { roomId: roomFixture.room.id });
  });

  it('Socket이 연결되지 않으면 Member 퇴장을 전송하지 않는다', () => {
    const client = {
      get: vi.fn(() => null),
    } as unknown as SocketClient;
    const { result } = renderHook(() => useLeaveRoom(roomFixture.room.id, client));

    expect(result.current()).toBe(false);
  });
});
