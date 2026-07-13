// Room Socket의 Host 연결 상태 이벤트가 Room 상태에 반영되는지 검증한다.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { SyfityListenEvents } from '@/shared/lib/socket/types';
import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { SocketAck } from '@/shared/types/api';
import type { PlaybackState } from '@/shared/types/domain';
import type { ServerToClientEvents } from '@/shared/types/socket';

import { useRoomStore } from './roomStore';
import { useRoomSocket } from './useRoomSocket';

type EventName = keyof SyfityListenEvents;
type EventHandler = (...args: never[]) => void;

const handlers = new Map<EventName, EventHandler>();
let roomJoinResponse: SocketAck<{ playbackState: PlaybackState }>;
const socket = {
  disconnect: vi.fn(),
  emit: vi.fn((event: string, _payload: unknown, ack?: (response: unknown) => void) => {
    if (event === 'room:join') {
      ack?.(roomJoinResponse);
    }
  }),
  off: vi.fn((event: EventName, handler?: EventHandler) => {
    if (!handler || handlers.get(event) === handler) {
      handlers.delete(event);
    }
  }),
  on: vi.fn((event: EventName, handler: EventHandler) => {
    handlers.set(event, handler);
  }),
};

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: vi.fn(),
  },
}));

function emitServerEvent<TEvent extends keyof ServerToClientEvents>(
  event: TEvent,
  payload: Parameters<ServerToClientEvents[TEvent]>[0],
) {
  const handler = handlers.get(event);

  if (!handler) {
    throw new Error(`${event} handler가 등록되지 않았습니다.`);
  }

  handler(payload as never);
}

describe('useRoomSocket', () => {
  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    vi.mocked(socketClient.connect).mockReturnValue(socket as never);
    roomJoinResponse = {
      success: true,
      data: { playbackState: roomFixture.playbackState },
    };
    useRoomStore.getState().clearRoom();
  });

  afterEach(() => {
    useRoomStore.getState().clearRoom();
  });

  it('Host 연결 끊김과 재연결 이벤트를 현재 Room 상태에 반영한다', () => {
    renderHook(() => useRoomSocket('room-a'));

    act(() => {
      emitServerEvent('room:host-disconnected', {
        roomId: 'room-a',
        waitUntil: '2026-07-13T08:00:00.000Z',
      });
    });

    expect(useRoomStore.getState().hostConnection).toEqual({
      status: 'disconnected',
      waitUntil: '2026-07-13T08:00:00.000Z',
    });

    act(() => {
      emitServerEvent('room:host-reconnected', { roomId: 'room-a' });
    });

    expect(useRoomStore.getState().hostConnection).toEqual({ status: 'connected' });
  });

  it('Socket 재접속 후 Room join에 성공하면 놓친 Host 재연결 상태를 보정한다', () => {
    renderHook(() => useRoomSocket('room-a'));

    act(() => {
      emitServerEvent('room:host-disconnected', {
        roomId: 'room-a',
        waitUntil: '2026-07-13T08:00:00.000Z',
      });
      handlers.get('connect')?.();
    });

    expect(useRoomStore.getState().hostConnection).toEqual({ status: 'connected' });
    expect(useRoomStore.getState().roomSocketError).toBeNull();
  });

  it('Socket 재접속 후 Room join에 실패하면 Host 연결 끊김 상태를 유지한다', () => {
    renderHook(() => useRoomSocket('room-a'));

    roomJoinResponse = {
      success: false,
      error: { code: 'ROOM_NOT_FOUND', message: 'Room을 찾을 수 없습니다.' },
    };

    act(() => {
      emitServerEvent('room:host-disconnected', {
        roomId: 'room-a',
        waitUntil: '2026-07-13T08:00:00.000Z',
      });
      handlers.get('connect')?.();
    });

    expect(useRoomStore.getState().hostConnection).toEqual({
      status: 'disconnected',
      waitUntil: '2026-07-13T08:00:00.000Z',
    });
    expect(useRoomStore.getState().roomSocketError).toBe('Room을 찾을 수 없습니다.');
  });

  it('다른 Room의 Host 연결 상태 이벤트는 무시한다', () => {
    renderHook(() => useRoomSocket('room-a'));

    act(() => {
      emitServerEvent('room:host-disconnected', {
        roomId: 'room-b',
        waitUntil: '2026-07-13T08:00:00.000Z',
      });
      emitServerEvent('room:closed', { reason: 'host-timeout', roomId: 'room-b' });
    });

    expect(useRoomStore.getState().hostConnection).toEqual({ status: 'connected' });
  });

  it('Room 종료 이벤트를 반영하고 종료 후 처리를 호출한다', () => {
    const onRoomClosed = vi.fn();
    useRoomStore.getState().setJoinedRoom(roomFixture);
    renderHook(() => useRoomSocket(roomFixture.room.id, onRoomClosed));

    act(() => {
      emitServerEvent('room:closed', {
        reason: 'host-timeout',
        roomId: roomFixture.room.id,
      });
    });

    expect(useRoomStore.getState().hostConnection).toEqual({
      reason: 'host-timeout',
      status: 'closed',
    });
    expect(useRoomStore.getState().room?.status).toBe('closed');
    expect(onRoomClosed).toHaveBeenCalledOnce();
  });

  it('unmount 시 Room 상태 이벤트 구독과 Room 참여를 정리한다', () => {
    const { unmount } = renderHook(() => useRoomSocket('room-a'));

    unmount();

    expect(handlers.has('room:host-disconnected')).toBe(false);
    expect(handlers.has('room:host-reconnected')).toBe(false);
    expect(handlers.has('room:closed')).toBe(false);
    expect(socket.emit).toHaveBeenCalledWith('room:leave', { roomId: 'room-a' });
  });
});
