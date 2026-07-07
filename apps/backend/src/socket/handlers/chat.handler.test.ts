import type { Server, Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { registerChatHandlers } from './chat.handler';
import { AppError } from '../../errors/appError';
import type { ChatService } from '../../services/chat.service';
import type { ChatMessageRecord } from '../../types/chat';
import type { ChatSendAck, ChatSendPayload } from '../../types/socket';

type ChatSendCallback = (
  payload: ChatSendPayload | null | undefined,
  ack: (response: ChatSendAck) => void,
) => Promise<void>;
type ChatHandlerService = Pick<ChatService, 'sendMessage'>;

const message: ChatMessageRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

function makeChatService(overrides: Partial<ChatHandlerService> = {}): ChatHandlerService {
  return {
    sendMessage: vi.fn().mockResolvedValue(message),
    ...overrides,
  };
}

function makeSocket(): { socket: Socket; handlers: Record<string, ChatSendCallback> } {
  const handlers: Record<string, ChatSendCallback> = {};
  const on = vi.fn((event: string, callback: ChatSendCallback) => {
    handlers[event] = callback;
  });
  const socketRef = {
    data: { userId: 'user-1' },
    on,
  };

  return { socket: socketRef as unknown as Socket, handlers };
}

function makeIo(): { io: Server; roomEmit: ReturnType<typeof vi.fn> } {
  const roomEmit = vi.fn();
  const io = {
    to: vi.fn().mockReturnValue({ emit: roomEmit }),
  } as unknown as Server;

  return { io, roomEmit };
}

function getSendHandler(handlers: Record<string, ChatSendCallback>): ChatSendCallback {
  return handlers['chat:send'];
}

describe('registerChatHandlers', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('chat:send 성공 시 메시지를 저장하고 chat:received를 broadcast한 뒤 성공 ack를 보낸다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const chatService = makeChatService();

    registerChatHandlers(io, socket, { chatService });
    const ack = vi.fn();
    await getSendHandler(handlers)({ roomId: 'room-1', message: 'hello' }, ack);

    expect(chatService.sendMessage).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: 'user-1',
      message: 'hello',
    });
    expect(io.to).toHaveBeenCalledWith('room:room-1');
    expect(roomEmit).toHaveBeenCalledWith('chat:received', {
      id: 'message-1',
      userId: 'user-1',
      nickname: 'Alice',
      profileImage: 'https://example.com/alice.png',
      type: 'user',
      message: 'hello',
      createdAt: '2026-07-01T12:00:00.000Z',
    });
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: { id: 'message-1', createdAt: '2026-07-01T12:00:00.000Z' },
    });
  });

  it('roomId가 없으면 VALIDATION_ERROR ack를 반환하고 service를 호출하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const chatService = makeChatService();

    registerChatHandlers(io, socket, { chatService });
    const ack = vi.fn();
    await getSendHandler(handlers)({ message: 'hello' } as ChatSendPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'roomId가 필요합니다.' },
    });
    expect(chatService.sendMessage).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('message가 없거나 문자열이 아니면 VALIDATION_ERROR ack를 반환한다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const chatService = makeChatService();

    registerChatHandlers(io, socket, { chatService });
    const ack = vi.fn();
    await getSendHandler(handlers)({ roomId: 'room-1' } as ChatSendPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'message가 필요합니다.' },
    });
    expect(chatService.sendMessage).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('service AppError는 ack error로 반환하고 broadcast하지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const chatService = makeChatService({
      sendMessage: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.'),
        ),
    });

    registerChatHandlers(io, socket, { chatService });
    const ack = vi.fn();
    await getSendHandler(handlers)({ roomId: 'room-1', message: 'hello' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.ROOM_ACCESS_DENIED,
        message: 'Room 참여자만 접근할 수 있습니다.',
      },
    });
    expect(io.to).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('알 수 없는 에러는 SERVER_INTERNAL_ERROR ack로 반환한다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const chatService = makeChatService({
      sendMessage: vi.fn().mockRejectedValue(new Error('boom')),
    });

    registerChatHandlers(io, socket, { chatService });
    const ack = vi.fn();
    await getSendHandler(handlers)({ roomId: 'room-1', message: 'hello' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_INTERNAL_ERROR,
        message: '알 수 없는 오류가 발생했습니다.',
      },
    });
  });
});
