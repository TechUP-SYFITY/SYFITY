import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';

import { useRoomStore } from '@/features/room/store/roomStore';

import { useRoomSocket } from './useRoomSocket';

const listeners = new Map<string, (payload: never) => void>();
const emit = vi.fn();

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: () => ({
      connected: true,
      connect: vi.fn(),
      emit,
      off: vi.fn(),
      on: vi.fn((event, listener) => listeners.set(event, listener)),
    }),
  },
}));

describe('useRoomSocket', () => {
  afterEach(() => {
    listeners.clear();
    emit.mockClear();
    useRoomStore.getState().clearRoom();
  });

  it('room:joined snapshot으로 Host 상태와 상위 시딩 callback을 갱신한다', () => {
    const onSnapshot = vi.fn();
    renderHook(() => useRoomSocket('room-1', onSnapshot));

    act(() => {
      listeners.get('room:joined')?.({
        roomId: 'room-1',
        hostConnection: { status: 'disconnected', waitUntil: '2026-07-19T12:00:00.000Z' },
        playbackState: roomFixture.playbackState,
        playbackPolicy: { repeatMode: 'off', shuffleEnabled: false },
        playlist: roomFixture.playlist,
        members: roomFixture.members,
        recentChats: roomFixture.chats,
      } as never);
    });

    expect(useRoomStore.getState().hostConnection).toEqual({
      status: 'disconnected',
      waitUntil: '2026-07-19T12:00:00.000Z',
    });
    expect(onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        playlist: roomFixture.playlist,
        recentChats: roomFixture.chats,
      }),
    );
  });

  it('room:join ack 실패는 socket 오류 상태에 기록한다', () => {
    renderHook(() => useRoomSocket('room-1'));
    const ack = emit.mock.calls.find((call) => call[0] === 'room:join')?.[2] as (
      response: unknown,
    ) => void;

    act(() => ack({ success: false, error: { code: 'ROOM_ACCESS_DENIED', message: 'denied' } }));

    expect(useRoomStore.getState().roomSocketError).toBe('denied');
  });
});
