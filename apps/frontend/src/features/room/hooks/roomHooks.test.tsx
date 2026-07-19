import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import { ApiClientError } from '@/shared/types/api';

import { useJoinRoom, useJoinRoomByCode } from './roomHooks';
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
});
