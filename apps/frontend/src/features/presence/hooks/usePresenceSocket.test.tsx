import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SyfitySocket } from '@/shared/lib/socket/types';
import type { RoomMember } from '@/shared/types/domain';

import { roomMemberQueryKeys } from './roomMemberHooks';
import { usePresenceSocket } from './usePresenceSocket';
import { usePresenceStore } from '../store/presenceStore';

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: vi.fn(),
  },
}));

const socket = {
  disconnect: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
} as unknown as SyfitySocket;

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('usePresenceSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePresenceStore.getState().clearMembers();
    vi.mocked(socketClient.connect).mockReturnValue(socket);
  });

  afterEach(() => {
    usePresenceStore.getState().clearMembers();
  });

  it('roomId가 없으면 socket에 연결하지 않는다', () => {
    const queryClient = createQueryClient();
    renderHook(() => usePresenceSocket(''), { wrapper: createWrapper(queryClient) });

    expect(socketClient.connect).not.toHaveBeenCalled();
  });

  it('presence:update 이벤트를 구독하고 수신 데이터를 반영한다', () => {
    const queryClient = createQueryClient();
    renderHook(() => usePresenceSocket('room-1'), { wrapper: createWrapper(queryClient) });

    expect(socketClient.connect).toHaveBeenCalledOnce();
    expect(socket.on).toHaveBeenCalledWith('presence:update', expect.any(Function));

    const listener = vi.mocked(socket.on).mock.calls[0]?.[1] as
      ((payload: Omit<RoomMember, 'id'>) => void) | undefined;
    expect(listener).toBeDefined();
    if (!listener) {
      throw new Error('presence:update listener가 등록되지 않았습니다.');
    }

    act(() => {
      listener({
        nickname: '새 멤버',
        profileImage: null,
        role: 'member',
        status: 'online',
        userId: 'member-1',
      });
    });

    expect(usePresenceStore.getState().members).toEqual([
      {
        nickname: '새 멤버',
        profileImage: null,
        role: 'member',
        status: 'online',
        userId: 'member-1',
      },
    ]);
  });

  it('언마운트 시 presence:update 구독을 해제한다', () => {
    const queryClient = createQueryClient();
    const { unmount } = renderHook(() => usePresenceSocket('room-1'), {
      wrapper: createWrapper(queryClient),
    });
    const listener = vi.mocked(socket.on).mock.calls[0]?.[1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith('presence:update', listener);
  });

  it('presence:update 수신 후 활성 RoomMember 목록을 갱신한다', () => {
    const queryClient = createQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => usePresenceSocket('room-1'), { wrapper: createWrapper(queryClient) });
    const listener = vi.mocked(socket.on).mock.calls[0]?.[1] as
      ((payload: Omit<RoomMember, 'id'>) => void) | undefined;

    expect(listener).toBeDefined();
    if (!listener) {
      throw new Error('presence:update listener가 등록되지 않았습니다.');
    }

    act(() => {
      listener({
        nickname: '새 멤버',
        profileImage: null,
        role: 'member',
        status: 'online',
        userId: 'member-1',
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: roomMemberQueryKeys.active('room-1'),
    });
  });
});
