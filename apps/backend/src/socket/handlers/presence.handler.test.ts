import type { Server, Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { registerPresenceHandlers } from './presence.handler';
import { AppError } from '../../errors/appError';
import type { PresenceService } from '../../services/presence.service';
import type { RoomService } from '../../services/room.service';
import type { ChatMessageRecord } from '../../types/chat';
import type { RoomMemberRecord } from '../../types/room';

type DisconnectingCallback = () => void;
type PresenceHandlerPresenceService = Pick<
  PresenceService,
  | 'getActiveMembershipRole'
  | 'scheduleMemberOfflineTimer'
  | 'cancelMemberOfflineTimer'
  | 'scheduleHostCloseTimer'
  | 'cancelHostCloseTimer'
  | 'setMemberOffline'
>;
type PresenceHandlerRoomService = Pick<RoomService, 'closeRoom' | 'createSystemMessage'>;

const offlineMember: RoomMemberRecord = {
  id: 'member-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: null,
  role: 'member',
  status: 'offline',
};

function makeSystemMessage(): ChatMessageRecord {
  return {
    id: 'message-system',
    userId: null,
    nickname: null,
    profileImage: null,
    type: 'system',
    message: 'Room이 종료되었습니다.',
    createdAt: new Date('2026-07-01T12:01:00.000Z'),
  };
}

function makePresenceService(
  overrides: Partial<PresenceHandlerPresenceService> = {},
): PresenceHandlerPresenceService {
  return {
    getActiveMembershipRole: vi.fn().mockResolvedValue('member'),
    scheduleMemberOfflineTimer: vi.fn((_roomId: string, _userId: string, onExpire: () => void) => {
      onExpire();
    }),
    cancelMemberOfflineTimer: vi.fn().mockReturnValue(true),
    scheduleHostCloseTimer: vi.fn((_roomId: string, onExpire: () => void) => {
      onExpire();
    }),
    cancelHostCloseTimer: vi.fn().mockReturnValue(true),
    setMemberOffline: vi.fn().mockResolvedValue(offlineMember),
    ...overrides,
  };
}

function makeRoomService(
  overrides: Partial<PresenceHandlerRoomService> = {},
): PresenceHandlerRoomService {
  return {
    closeRoom: vi.fn().mockResolvedValue({
      id: 'room-1',
      name: 'Morning Jazz',
      hostId: 'user-1',
      inviteCode: 'ABC123',
      status: 'active',
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
    }),
    createSystemMessage: vi.fn().mockResolvedValue(makeSystemMessage()),
    ...overrides,
  };
}

function makeSocket(roomKeys: string[] = ['socket-1', 'room:room-1']): {
  socket: Socket;
  handlers: Record<string, DisconnectingCallback>;
} {
  const handlers: Record<string, DisconnectingCallback> = {};
  const on = vi.fn((event: string, callback: DisconnectingCallback) => {
    handlers[event] = callback;
  });
  const socketRef = {
    id: 'socket-1',
    data: { userId: 'user-1' },
    rooms: new Set(roomKeys),
    on,
  };

  return { socket: socketRef as unknown as Socket, handlers };
}

function makeIo(fetchSocketsResult: Array<{ id: string; data: { userId: string } }> = []) {
  const roomEmit = vi.fn();
  const socketsLeave = vi.fn();
  const fetchSockets = vi.fn().mockResolvedValue(fetchSocketsResult);
  const io = {
    in: vi.fn().mockReturnValue({ fetchSockets }),
    to: vi.fn().mockReturnValue({ emit: roomEmit }),
    socketsLeave,
  } as unknown as Server;

  return { io, roomEmit, socketsLeave, fetchSockets };
}

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

describe('registerPresenceHandlers', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    vi.useRealTimers();
  });

  it('일반 멤버 disconnect 후 offline으로 전환하고 presence:update를 broadcast한다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService();

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(presenceService.getActiveMembershipRole).toHaveBeenCalledWith('room-1', 'user-1');
    expect(presenceService.scheduleMemberOfflineTimer).toHaveBeenCalledWith(
      'room-1',
      'user-1',
      expect.any(Function),
    );
    expect(presenceService.cancelMemberOfflineTimer).toHaveBeenCalledWith('room-1', 'user-1');
    expect(presenceService.setMemberOffline).toHaveBeenCalledWith('room-1', 'user-1');
    expect(roomEmit).toHaveBeenCalledWith('presence:update', {
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: null,
      role: 'member',
      status: 'offline',
    });
    expect(roomEmit).not.toHaveBeenCalledWith('room:host-disconnected', expect.anything());
  });

  it('Host disconnect 시 즉시 host-disconnected를 보내고 timeout 시 Room을 닫는다', async () => {
    const { io, roomEmit, socketsLeave } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockResolvedValue('host'),
      setMemberOffline: vi.fn().mockResolvedValue({ ...offlineMember, role: 'host' }),
    });
    const roomService = makeRoomService();

    registerPresenceHandlers(io, socket, { presenceService, roomService });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(roomEmit).toHaveBeenCalledWith('room:host-disconnected', {
      roomId: 'room-1',
      waitUntil: '2026-07-01T12:01:00.000Z',
    });
    expect(roomEmit).toHaveBeenCalledWith('presence:update', {
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: null,
      role: 'host',
      status: 'offline',
    });
    expect(roomService.closeRoom).toHaveBeenCalledWith('room-1', 'user-1');
    expect(roomEmit).toHaveBeenCalledWith('chat:system', {
      id: 'message-system',
      type: 'system',
      message: 'Room이 종료되었습니다.',
      createdAt: '2026-07-01T12:01:00.000Z',
    });
    expect(roomEmit).toHaveBeenCalledWith('room:closed', {
      roomId: 'room-1',
      reason: 'host-timeout',
    });
    const systemCall = roomEmit.mock.calls.findIndex((call) => call[0] === 'chat:system');
    const closedCall = roomEmit.mock.calls.findIndex((call) => call[0] === 'room:closed');
    expect(systemCall).toBeGreaterThanOrEqual(0);
    expect(systemCall).toBeLessThan(closedCall);
    expect(socketsLeave).toHaveBeenCalledWith('room:room-1');
  });

  it('같은 사용자의 다른 활성 소켓이 남아있으면 타이머를 시작하지 않는다', async () => {
    const { io, roomEmit } = makeIo([
      { id: 'socket-1', data: { userId: 'user-1' } },
      { id: 'socket-2', data: { userId: 'user-1' } },
    ]);
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService();

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(presenceService.getActiveMembershipRole).not.toHaveBeenCalled();
    expect(presenceService.scheduleMemberOfflineTimer).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('활성 멤버십이 없으면 타이머를 시작하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockResolvedValue(null),
    });

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(presenceService.scheduleMemberOfflineTimer).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('socket.rooms에 room prefix가 없으면 아무 처리도 하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket(['socket-1']);
    const presenceService = makePresenceService();

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(io.in).not.toHaveBeenCalled();
    expect(presenceService.getActiveMembershipRole).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('host-timeout에서 Room이 이미 종료된 경우 종료 이벤트를 broadcast하지 않는다', async () => {
    const { io, roomEmit, socketsLeave } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockResolvedValue('host'),
      setMemberOffline: vi.fn().mockResolvedValue(null),
    });
    const roomService = makeRoomService({
      closeRoom: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.'),
        ),
    });

    registerPresenceHandlers(io, socket, { presenceService, roomService });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(consoleError).toHaveBeenCalledWith(
      '[presence] host-timeout closeRoom 생략(이미 종료됨)',
      expect.any(AppError),
    );
    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(roomEmit).not.toHaveBeenCalledWith('room:closed', expect.anything());
    expect(socketsLeave).not.toHaveBeenCalled();
  });

  it('host-timeout에서 예상 밖 Room 종료 실패는 별도 메시지로 로깅한다', async () => {
    const { io, roomEmit, socketsLeave } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockResolvedValue('host'),
      setMemberOffline: vi.fn().mockResolvedValue(null),
    });
    const unexpectedError = new Error('db failed');
    const roomService = makeRoomService({
      closeRoom: vi.fn().mockRejectedValue(unexpectedError),
    });

    registerPresenceHandlers(io, socket, { presenceService, roomService });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(consoleError).toHaveBeenCalledWith(
      '[presence] host-timeout closeRoom 실패',
      unexpectedError,
    );
    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(roomEmit).not.toHaveBeenCalledWith('room:closed', expect.anything());
    expect(socketsLeave).not.toHaveBeenCalled();
  });

  it('offline 콜백에서 이미 상태가 바뀐 경우 presence:update를 broadcast하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      setMemberOffline: vi.fn().mockResolvedValue(null),
    });

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(roomEmit).not.toHaveBeenCalledWith('presence:update', expect.anything());
  });

  it('역할 조회 중 재연결이 완료되면 오프라인 타이머를 예약하지 않는다', async () => {
    const { io, roomEmit, fetchSockets } = makeIo();
    fetchSockets
      .mockResolvedValueOnce([]) // 최초 확인: 다른 활성 소켓 없음
      .mockResolvedValueOnce([{ id: 'socket-2', data: { userId: 'user-1' } }]); // 스케줄 직전 재확인: 재연결됨
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService();

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(presenceService.getActiveMembershipRole).toHaveBeenCalledWith('room-1', 'user-1');
    expect(presenceService.scheduleMemberOfflineTimer).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('오프라인 타이머 발화 시점에 재연결되어 있으면 offline 처리를 건너뛴다', async () => {
    const { io, roomEmit, fetchSockets } = makeIo();
    fetchSockets
      .mockResolvedValueOnce([]) // 최초 확인
      .mockResolvedValueOnce([]) // 스케줄 직전 재확인
      .mockResolvedValueOnce([{ id: 'socket-2', data: { userId: 'user-1' } }]); // 타이머 발화 시점: 재연결됨
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService();

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(presenceService.scheduleMemberOfflineTimer).toHaveBeenCalled();
    expect(presenceService.setMemberOffline).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalledWith('presence:update', expect.anything());
  });

  it('Host 타이머 발화 시점에 재연결되어 있으면 offline 처리와 Room 종료를 모두 건너뛴다', async () => {
    const { io, roomEmit, socketsLeave, fetchSockets } = makeIo();
    fetchSockets
      .mockResolvedValueOnce([]) // 최초 확인
      .mockResolvedValueOnce([]) // 스케줄 직전 재확인
      .mockResolvedValueOnce([{ id: 'socket-2', data: { userId: 'user-1' } }]) // member 오프라인 타이머 발화 시점: 재연결됨
      .mockResolvedValueOnce([{ id: 'socket-2', data: { userId: 'user-1' } }]); // host 타이머 발화 시점: 재연결됨
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockResolvedValue('host'),
    });
    const roomService = makeRoomService();

    registerPresenceHandlers(io, socket, { presenceService, roomService });
    handlers.disconnecting();
    await flushAsyncHandlers();

    expect(roomEmit).toHaveBeenCalledWith('room:host-disconnected', {
      roomId: 'room-1',
      waitUntil: '2026-07-01T12:01:00.000Z',
    });
    expect(presenceService.setMemberOffline).not.toHaveBeenCalled();
    expect(roomService.closeRoom).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalledWith('presence:update', expect.anything());
    expect(roomEmit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(roomEmit).not.toHaveBeenCalledWith('room:closed', expect.anything());
    expect(socketsLeave).not.toHaveBeenCalled();
  });

  it('disconnect 처리 중 에러가 나도 핸들러 밖으로 전파하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const presenceService = makePresenceService({
      getActiveMembershipRole: vi.fn().mockRejectedValue(new Error('boom')),
    });

    registerPresenceHandlers(io, socket, {
      presenceService,
      roomService: makeRoomService(),
    });

    expect(() => handlers.disconnecting()).not.toThrow();
    await flushAsyncHandlers();
    expect(roomEmit).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[presence] disconnect 처리 실패', expect.any(Error));
  });
});
