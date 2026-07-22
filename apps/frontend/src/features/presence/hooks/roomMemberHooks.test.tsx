import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  roomMemberQueryKeys,
  useActiveRoomMembers,
  useKickRoomMember,
  useKickedRoomMembers,
  useUnkickRoomMember,
} from './roomMemberHooks';
import { roomMemberApi } from '../api/roomMemberApi';

vi.mock('../api/roomMemberApi', () => ({
  roomMemberApi: {
    getActiveMembers: vi.fn(),
    getKickedMembers: vi.fn(),
    updateMember: vi.fn(),
  },
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('room member hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Host 관리가 비활성화되어 있으면 활성 멤버를 조회하지 않는다', async () => {
    vi.mocked(roomMemberApi.getActiveMembers).mockResolvedValue({ members: [] });
    const queryClient = createQueryClient();
    const { result, rerender } = renderHook(
      ({ enabled }) => useActiveRoomMembers('room-1', enabled),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(queryClient),
      },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(roomMemberApi.getActiveMembers).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roomMemberApi.getActiveMembers).toHaveBeenCalledWith('room-1');
  });

  it('추방 목록 Dialog가 열릴 때 추방 멤버를 조회한다', async () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [] });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useKickedRoomMembers('room-1', true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(roomMemberApi.getKickedMembers).toHaveBeenCalledWith('room-1');
  });

  it('멤버를 kicked 상태로 변경하고 Room 멤버 Query를 갱신한다', async () => {
    vi.mocked(roomMemberApi.updateMember).mockResolvedValue({
      memberId: 'membership-1',
      status: 'kicked',
    });
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useKickRoomMember('room-1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('membership-1');
    });

    expect(roomMemberApi.updateMember).toHaveBeenCalledWith('room-1', 'membership-1', {
      status: 'kicked',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: roomMemberQueryKeys.all('room-1'),
    });
  });

  it('멤버를 left 상태로 변경하고 Room 멤버 Query를 갱신한다', async () => {
    vi.mocked(roomMemberApi.updateMember).mockResolvedValue({
      memberId: 'membership-1',
      status: 'left',
    });
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUnkickRoomMember('room-1'), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('membership-1');
    });

    expect(roomMemberApi.updateMember).toHaveBeenCalledWith('room-1', 'membership-1', {
      status: 'left',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: roomMemberQueryKeys.all('room-1'),
    });
  });
});
