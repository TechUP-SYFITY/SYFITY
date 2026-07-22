import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocketClient, SyfitySocket } from '@/shared/lib/socket/types';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { ApiClientError } from '@/shared/types/api';

import {
  useCloseRoom,
  useCreateRoom,
  useJoinRoom,
  useJoinRoomByCode,
  useLeaveRoom,
  useMyRooms,
  useRecoverRoom,
  useUpdateRoom,
} from './roomHooks';
import { roomApi } from '../api/roomApi';
import type {
  CreateRoomMembershipResponse,
  MyRoomsResponse,
  RoomResponse,
} from '../types/roomTypes';

vi.mock('../api/roomApi', () => ({
  roomApi: {
    createRoomMembership: vi.fn(),
    createRoom: vi.fn(),
    getMyRooms: vi.fn(),
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
const myRooms = {
  rooms: [
    {
      closedAt: null,
      id: 'active-room',
      name: '활성 Room',
      status: 'active',
      updatedAt: '2026-07-21T08:00:00.000Z',
    },
    {
      closedAt: '2026-07-20T08:00:00.000Z',
      id: 'closed-room',
      name: '종료된 Room',
      status: 'closed',
      updatedAt: '2026-07-20T08:00:00.000Z',
    },
  ],
} satisfies MyRoomsResponse;

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

  it('내 Room 목록을 전용 query key로 조회한다', async () => {
    vi.mocked(roomApi.getMyRooms).mockResolvedValue(myRooms);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useMyRooms(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roomApi.getMyRooms).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(myRooms);
    expect(queryClient.getQueryData(['rooms', 'mine'])).toEqual(myRooms);
  });

  it('Room 생성 성공 후 내 Room과 최근 Room 쿼리를 갱신한다', async () => {
    vi.mocked(roomApi.createRoom).mockResolvedValue({
      createdAt: '2026-07-21T08:00:00.000Z',
      id: 'new-room',
      inviteCode: 'ABC123',
      name: '새 Room',
      status: 'active',
    });
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateRoom(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: '새 Room' });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'mine'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'recent'] });
  });

  it('Room 이름 변경 성공 후 상세와 Home Room 쿼리를 갱신한다', async () => {
    vi.mocked(roomApi.updateRoom).mockResolvedValue({
      closedAt: null,
      id: roomFixture.room.id,
      name: '변경된 Room',
      status: 'active',
      updatedAt: '2026-07-22T01:00:00.000Z',
    });
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateRoom(roomFixture.room.id), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: '변경된 Room' });
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rooms', 'detail', roomFixture.room.id],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'mine'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'recent'] });
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

  it('Room 복구는 PATCH에 status: active를 전달하고 Home 쿼리를 갱신한다', async () => {
    vi.mocked(roomApi.updateRoom).mockResolvedValue({
      id: roomFixture.room.id,
      name: roomFixture.room.name,
      status: 'active',
      closedAt: null,
      updatedAt: '2026-07-22T02:00:00.000Z',
    });
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecoverRoom(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(roomFixture.room.id);
    });

    expect(roomApi.updateRoom).toHaveBeenCalledWith(roomFixture.room.id, { status: 'active' });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['rooms', 'detail', roomFixture.room.id],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'mine'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'recent'] });
  });

  it('복구 기간 만료 시 내 Room 목록을 갱신한다', async () => {
    const error = new ApiClientError(
      { code: 'ROOM_RECOVERY_EXPIRED', message: 'Room recovery period expired' },
      409,
    );
    vi.mocked(roomApi.updateRoom).mockRejectedValue(error);
    const queryClient = createQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRecoverRoom(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(roomFixture.room.id)).rejects.toBe(error);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['rooms', 'mine'] });
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
