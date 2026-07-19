import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';

import { useRoomStore } from '@/features/room/store/roomStore';

import { useRoomSocket } from './useRoomSocket';

const { emit, listeners, socketConnect } = vi.hoisted(() => {
  const eventListeners = new Map<string, (payload: never) => void>();
  const socketEmit = vi.fn();
  const socket = {
    connected: true,
    connect: vi.fn(),
    emit: socketEmit,
    off: vi.fn(),
    on: vi.fn((event, listener) => eventListeners.set(event, listener)),
  };
  const socketConnector = vi.fn(() => socket);

  return { emit: socketEmit, listeners: eventListeners, socketConnect: socketConnector };
});

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: socketConnect,
  },
}));

describe('useRoomSocket', () => {
  afterEach(() => {
    listeners.clear();
    emit.mockClear();
    socketConnect.mockClear();
    useRoomStore.getState().clearRoom();
  });

  it('roomId가 비어 있으면 Socket을 연결하지 않는다', () => {
    renderHook(() => useRoomSocket(''));

    expect(socketConnect).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
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

  it('현재 Room의 host 연결 상태 이벤트를 store에 반영한다', () => {
    renderHook(() => useRoomSocket('room-1'));

    act(() => {
      listeners.get('room:host-disconnected')?.({
        roomId: 'room-1',
        waitUntil: '2026-07-19T12:00:00.000Z',
      } as never);
    });
    expect(useRoomStore.getState().hostConnection).toEqual({
      status: 'disconnected',
      waitUntil: '2026-07-19T12:00:00.000Z',
    });

    act(() => {
      listeners.get('room:host-reconnected')?.({ roomId: 'room-1' } as never);
    });
    expect(useRoomStore.getState().hostConnection).toEqual({ status: 'connected' });
  });

  it('다른 Room의 Socket 이벤트는 무시한다', () => {
    const onRoomClosed = vi.fn();
    renderHook(() => useRoomSocket('room-1', undefined, onRoomClosed));

    act(() => {
      listeners.get('room:host-disconnected')?.({
        roomId: 'room-2',
        waitUntil: '2026-07-19T12:00:00.000Z',
      } as never);
      listeners.get('room:closed')?.({ roomId: 'room-2', reason: 'host-closed' } as never);
    });

    expect(useRoomStore.getState().hostConnection).toEqual({ status: 'connected' });
    expect(onRoomClosed).not.toHaveBeenCalled();
  });

  it('현재 Room이 종료되면 store를 갱신하고 onRoomClosed를 호출한다', () => {
    const onRoomClosed = vi.fn();
    renderHook(() => useRoomSocket('room-1', undefined, onRoomClosed));

    act(() => {
      listeners.get('room:closed')?.({ roomId: 'room-1', reason: 'host-closed' } as never);
    });

    expect(useRoomStore.getState().hostConnection).toEqual({
      status: 'closed',
      reason: 'host-closed',
    });
    expect(onRoomClosed).toHaveBeenCalledOnce();
  });
});
