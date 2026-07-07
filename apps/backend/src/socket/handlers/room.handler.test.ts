import type { Server, Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { registerRoomHandlers } from './room.handler';
import { AppError } from '../../errors/appError';
import type { PlaybackService } from '../../services/playback.service';
import type { RoomService } from '../../services/room.service';
import type { ChatMessageRecord } from '../../types/chat';
import type { RoomMemberRecord } from '../../types/room';
import type { RoomJoinAck, RoomJoinPayload, RoomLeavePayload } from '../../types/socket';

type RoomJoinCallback = (
  payload: RoomJoinPayload | null | undefined,
  ack: (response: RoomJoinAck) => void,
) => Promise<void>;
type RoomLeaveCallback = (payload: RoomLeavePayload | null | undefined) => Promise<void>;
type RoomHandlerCallback = RoomJoinCallback | RoomLeaveCallback;
type RoomHandlerService = Pick<
  RoomService,
  'setMemberOnline' | 'leaveRoom' | 'createSystemMessage'
>;
type RoomHandlerPlaybackService = Pick<PlaybackService, 'getPlaybackStateForSocket'>;

const member: RoomMemberRecord = {
  id: 'member-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: null,
  role: 'member',
  status: 'online',
};

const playbackState = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  currentTime: 30,
  isPlaying: false,
};

function makeSystemMessage(message: string): ChatMessageRecord {
  return {
    id: 'message-system',
    userId: null,
    nickname: null,
    profileImage: null,
    type: 'system',
    message,
    createdAt: new Date('2026-07-01T12:01:00.000Z'),
  };
}

function makeRoomService(overrides: Partial<RoomHandlerService> = {}): RoomHandlerService {
  return {
    setMemberOnline: vi.fn().mockResolvedValue({ member, wasOnline: false }),
    leaveRoom: vi.fn().mockResolvedValue({ type: 'left', member: { ...member, status: 'left' } }),
    createSystemMessage: vi
      .fn()
      .mockImplementation((_roomId: string, message: string) =>
        Promise.resolve(makeSystemMessage(message)),
      ),
    ...overrides,
  };
}

function makePlaybackService(
  overrides: Partial<RoomHandlerPlaybackService> = {},
): RoomHandlerPlaybackService {
  return {
    getPlaybackStateForSocket: vi.fn().mockResolvedValue(playbackState),
    ...overrides,
  };
}

function makeSocket(): { socket: Socket; handlers: Record<string, RoomHandlerCallback> } {
  const handlers: Record<string, RoomHandlerCallback> = {};
  const on = vi.fn((event: string, callback: RoomHandlerCallback) => {
    handlers[event] = callback;
  });
  const socketRef = {
    data: { userId: 'user-1' },
    join: vi.fn(),
    leave: vi.fn(),
    on,
  };

  return { socket: socketRef as unknown as Socket, handlers };
}

function makeIo(): {
  io: Server;
  roomEmit: ReturnType<typeof vi.fn>;
  socketsLeave: ReturnType<typeof vi.fn>;
} {
  const roomEmit = vi.fn();
  const socketsLeave = vi.fn();
  const io = {
    to: vi.fn().mockReturnValue({ emit: roomEmit }),
    socketsLeave,
  } as unknown as Server;

  return { io, roomEmit, socketsLeave };
}

function getJoinHandler(handlers: Record<string, RoomHandlerCallback>): RoomJoinCallback {
  return handlers['room:join'] as RoomJoinCallback;
}

function getLeaveHandler(handlers: Record<string, RoomHandlerCallback>): RoomLeaveCallback {
  return handlers['room:leave'] as RoomLeaveCallback;
}

describe('registerRoomHandlers', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('room:join 성공 시 Socket Room에 참가하고 presence:update, chat:system, 성공 ack를 보낸다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService();
    const playbackService = makePlaybackService();

    registerRoomHandlers(io, socket, { roomService, playbackService });
    const ack = vi.fn();
    await getJoinHandler(handlers)({ roomId: 'room-1' }, ack);

    expect(roomService.setMemberOnline).toHaveBeenCalledWith('room-1', 'user-1');
    expect(playbackService.getPlaybackStateForSocket).toHaveBeenCalledWith('room-1', 'user-1');
    expect(socket.join).toHaveBeenCalledWith('room:room-1');
    expect(io.to).toHaveBeenCalledWith('room:room-1');
    expect(roomEmit).toHaveBeenCalledWith('presence:update', {
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: null,
      role: 'member',
      status: 'online',
    });
    expect(roomService.createSystemMessage).toHaveBeenCalledWith(
      'room-1',
      'Alice님이 입장했습니다.',
    );
    expect(roomEmit).toHaveBeenCalledWith('chat:system', {
      id: 'message-system',
      type: 'system',
      message: 'Alice님이 입장했습니다.',
      createdAt: '2026-07-01T12:01:00.000Z',
    });
    expect(ack).toHaveBeenCalledWith({ success: true, data: { playbackState } });
  });

  it('room:join에서 이미 online 상태면 시스템 메시지를 생성하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      setMemberOnline: vi.fn().mockResolvedValue({ member, wasOnline: true }),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    const ack = vi.fn();
    await getJoinHandler(handlers)({ roomId: 'room-1' }, ack);

    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(ack).toHaveBeenCalledWith({ success: true, data: { playbackState } });
  });

  it('room:join 시스템 메시지 생성 실패 시 chat:system 없이 성공 ack를 보낸다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      createSystemMessage: vi.fn().mockResolvedValue(null),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    const ack = vi.fn();
    await getJoinHandler(handlers)({ roomId: 'room-1' }, ack);

    expect(roomEmit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(ack).toHaveBeenCalledWith({ success: true, data: { playbackState } });
  });

  it('room:join에서 roomId가 없으면 VALIDATION_ERROR ack를 반환하고 service를 호출하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService();
    const playbackService = makePlaybackService();

    registerRoomHandlers(io, socket, { roomService, playbackService });
    const ack = vi.fn();
    await getJoinHandler(handlers)({} as RoomJoinPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'roomId가 필요합니다.' },
    });
    expect(roomService.setMemberOnline).not.toHaveBeenCalled();
    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('room:join service AppError는 ack error로 반환하고 브로드캐스트하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      setMemberOnline: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.'),
        ),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    const ack = vi.fn();
    await getJoinHandler(handlers)({ roomId: 'room-1' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.ROOM_ACCESS_DENIED,
        message: 'Room 참여자만 접근할 수 있습니다.',
      },
    });
    expect(socket.join).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('room:join 알 수 없는 에러는 SERVER_INTERNAL_ERROR ack로 반환한다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      setMemberOnline: vi.fn().mockRejectedValue(new Error('boom')),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    const ack = vi.fn();
    await getJoinHandler(handlers)({ roomId: 'room-1' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_INTERNAL_ERROR,
        message: '알 수 없는 오류가 발생했습니다.',
      },
    });
  });

  it('room:leave 일반 멤버는 Socket Room에서 제거하고 presence:update와 chat:system을 보낸다', async () => {
    const { io, roomEmit, socketsLeave } = makeIo();
    const { socket, handlers } = makeSocket();
    const leftMember: RoomMemberRecord = { ...member, status: 'left' };
    const roomService = makeRoomService({
      leaveRoom: vi.fn().mockResolvedValue({ type: 'left', member: leftMember }),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    await getLeaveHandler(handlers)({ roomId: 'room-1' });

    expect(roomService.leaveRoom).toHaveBeenCalledWith('room-1', 'user-1');
    expect(socket.leave).toHaveBeenCalledWith('room:room-1');
    expect(roomEmit).toHaveBeenCalledWith('presence:update', {
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: null,
      role: 'member',
      status: 'left',
    });
    expect(roomService.createSystemMessage).toHaveBeenCalledWith(
      'room-1',
      'Alice님이 퇴장했습니다.',
    );
    expect(roomEmit).toHaveBeenCalledWith('chat:system', {
      id: 'message-system',
      type: 'system',
      message: 'Alice님이 퇴장했습니다.',
      createdAt: '2026-07-01T12:01:00.000Z',
    });
    expect(roomEmit).not.toHaveBeenCalledWith('room:closed', expect.anything());
    expect(socketsLeave).not.toHaveBeenCalled();
  });

  it('room:leave Host는 chat:system, room:closed를 보낸 뒤 Socket Room을 해제한다', async () => {
    const { io, roomEmit, socketsLeave } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      leaveRoom: vi.fn().mockResolvedValue({ type: 'closed' }),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    await getLeaveHandler(handlers)({ roomId: 'room-1' });

    expect(socket.leave).toHaveBeenCalledWith('room:room-1');
    expect(roomService.createSystemMessage).toHaveBeenCalledWith(
      'room-1',
      'Room이 종료되었습니다.',
    );
    expect(roomEmit).toHaveBeenCalledWith('chat:system', {
      id: 'message-system',
      type: 'system',
      message: 'Room이 종료되었습니다.',
      createdAt: '2026-07-01T12:01:00.000Z',
    });
    expect(roomEmit).toHaveBeenCalledWith('room:closed', {
      roomId: 'room-1',
      reason: 'host-left',
    });
    const systemCall = roomEmit.mock.calls.findIndex((call) => call[0] === 'chat:system');
    const closedCall = roomEmit.mock.calls.findIndex((call) => call[0] === 'room:closed');
    expect(systemCall).toBeGreaterThanOrEqual(0);
    expect(systemCall).toBeLessThan(closedCall);
    expect(roomEmit).not.toHaveBeenCalledWith('presence:update', expect.anything());
    expect(socketsLeave).toHaveBeenCalledWith('room:room-1');
  });

  it('room:leave에서 roomId가 없으면 service와 socket/io를 호출하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService();

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    await expect(getLeaveHandler(handlers)({} as RoomLeavePayload)).resolves.toBeUndefined();

    expect(roomService.leaveRoom).not.toHaveBeenCalled();
    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('room:leave service 에러는 핸들러 밖으로 전파하지 않고 브로드캐스트하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const roomService = makeRoomService({
      leaveRoom: vi.fn().mockRejectedValue(new Error('boom')),
    });

    registerRoomHandlers(io, socket, { roomService, playbackService: makePlaybackService() });
    await expect(getLeaveHandler(handlers)({ roomId: 'room-1' })).resolves.toBeUndefined();

    expect(socket.leave).not.toHaveBeenCalled();
    expect(roomService.createSystemMessage).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });
});
