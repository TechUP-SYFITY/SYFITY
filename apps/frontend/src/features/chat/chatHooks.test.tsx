import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage } from '@/shared/types/domain';
import type {
  ChatSendAckData,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/shared/types/socket';

import { CHAT_MAX_MESSAGE_LENGTH } from './chatConstants';
import { useChatSocket, useSendChatMessage } from './chatHooks';
import { useChatStore } from './chatStore';

const socketMock = vi.hoisted(() => ({
  connect: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
}));

vi.mock('@/shared/lib/socket/socketClient', () => ({
  socketClient: {
    connect: socketMock.connect,
    disconnect: vi.fn(),
    get: vi.fn(),
  },
}));

const roomId = 'room-1';

const receivedMessage: ChatMessage = {
  createdAt: '2026-07-01T10:12:00.000Z',
  id: 'chat-1',
  message: '안녕하세요.',
  nickname: '민지',
  profileImage: null,
  type: 'user',
  userId: 'user-1',
};

function getListener<Ev extends keyof ServerToClientEvents>(event: Ev) {
  const call = socketMock.on.mock.calls.find(([eventName]) => eventName === event);

  if (!call) {
    throw new Error(`${event} listener was not registered.`);
  }

  return call[1] as ServerToClientEvents[Ev];
}

function getChatSendAck() {
  const call = socketMock.emit.mock.calls.find(([eventName]) => eventName === 'chat:send');

  if (!call) {
    throw new Error('chat:send was not emitted.');
  }

  return call[2] as Parameters<ClientToServerEvents['chat:send']>[1];
}

describe('chatHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketMock.connect.mockReturnValue({
      disconnect: vi.fn(),
      emit: socketMock.emit,
      off: socketMock.off,
      on: socketMock.on,
    });
    useChatStore.getState().clearMessages();
  });

  it('useChatSocket은 roomId가 없으면 소켓에 연결하지 않는다', () => {
    renderHook(() => useChatSocket(''));

    expect(socketMock.connect).not.toHaveBeenCalled();
  });

  it('useChatSocket은 chat:received 수신 메시지를 store에 추가한다', () => {
    const { unmount } = renderHook(() => useChatSocket(roomId));

    act(() => {
      getListener('chat:received')(receivedMessage);
    });

    expect(useChatStore.getState().messages).toEqual([receivedMessage]);

    unmount();

    expect(socketMock.off).toHaveBeenCalledWith('chat:received', expect.any(Function));
  });

  it('useChatSocket은 chat:system 수신 메시지를 store에 추가한다', () => {
    const systemMessage: ChatMessage = {
      createdAt: '2026-07-01T10:13:00.000Z',
      id: 'chat-system-1',
      message: 'Host가 재생을 시작했습니다.',
      nickname: null,
      profileImage: null,
      type: 'system',
      userId: null,
    };
    renderHook(() => useChatSocket(roomId));

    act(() => {
      getListener('chat:system')(systemMessage);
    });

    expect(useChatStore.getState().messages).toEqual([systemMessage]);
  });

  it('useSendChatMessage는 빈 문자열을 전송하지 않는다', () => {
    const { result } = renderHook(() => useSendChatMessage(roomId, '민지', null));

    act(() => {
      result.current.sendMessage('   ');
    });

    expect(socketMock.emit).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('useSendChatMessage는 300자를 초과한 메시지를 전송하지 않는다', () => {
    const { result } = renderHook(() => useSendChatMessage(roomId, '민지', null));

    act(() => {
      result.current.sendMessage('가'.repeat(CHAT_MAX_MESSAGE_LENGTH + 1));
    });

    expect(socketMock.emit).not.toHaveBeenCalled();
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('useSendChatMessage는 정상 메시지를 optimistic 추가하고 성공 ack로 reconcile한다', () => {
    const { result } = renderHook(() =>
      useSendChatMessage(roomId, '민지', 'https://example.com/me.jpg'),
    );

    act(() => {
      result.current.sendMessage('  안녕하세요  ');
    });

    expect(socketMock.emit).toHaveBeenCalledWith(
      'chat:send',
      { message: '안녕하세요', roomId },
      expect.any(Function),
    );
    expect(useChatStore.getState().messages).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^temp-/) as string,
        message: '안녕하세요',
        nickname: '민지',
        profileImage: 'https://example.com/me.jpg',
      }),
    ]);

    act(() => {
      getChatSendAck()({
        success: true,
        data: {
          createdAt: '2026-07-01T10:15:00.000Z',
          id: 'chat-2',
        },
      });
    });

    expect(useChatStore.getState().messages).toEqual([
      expect.objectContaining({
        createdAt: '2026-07-01T10:15:00.000Z',
        id: 'chat-2',
        message: '안녕하세요',
      }),
    ]);
  });

  it('useSendChatMessage는 실패 ack에서 optimistic 메시지를 제거하고 오류를 저장한다', () => {
    const { result } = renderHook(() => useSendChatMessage(roomId, '민지', null));

    act(() => {
      result.current.sendMessage('실패할 메시지');
    });

    act(() => {
      getChatSendAck()({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '메시지 전송 실패',
        },
      } satisfies SocketAck<ChatSendAckData>);
    });

    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().sendError).toBe('메시지 전송 실패');
  });
});
