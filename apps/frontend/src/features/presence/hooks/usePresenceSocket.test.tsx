import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SyfitySocket } from '@/shared/lib/socket/types';
import type { RoomMember } from '@/shared/types/domain';

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
    renderHook(() => usePresenceSocket(''));

    expect(socketClient.connect).not.toHaveBeenCalled();
  });

  it('presence:update 이벤트를 구독하고 수신 데이터를 반영한다', () => {
    renderHook(() => usePresenceSocket('room-1'));

    expect(socketClient.connect).toHaveBeenCalledOnce();
    expect(socket.on).toHaveBeenCalledWith('presence:update', expect.any(Function));

    const listener = vi.mocked(socket.on).mock.calls[0]?.[1] as
      ((payload: Omit<RoomMember, 'id'>) => void) | undefined;
    expect(listener).toBeDefined();
    if (!listener) {
      throw new Error('presence:update listener가 등록되지 않았습니다.');
    }

    listener({
      nickname: '새 멤버',
      profileImage: null,
      role: 'member',
      status: 'online',
      userId: 'member-1',
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
    const { unmount } = renderHook(() => usePresenceSocket('room-1'));
    const listener = vi.mocked(socket.on).mock.calls[0]?.[1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith('presence:update', listener);
  });
});
