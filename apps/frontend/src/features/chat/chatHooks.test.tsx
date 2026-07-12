import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage } from '@/shared/types/domain';
import type {
  ChatSendAckData,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/shared/types/socket';

import { chatApi } from './chatApi';
import { CHAT_MAX_MESSAGE_LENGTH } from './chatConstants';
import {
  type UseChatScrollResult,
  useChatScroll,
  useChatSocket,
  useSendChatMessage,
} from './chatHooks';
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

vi.mock('./chatApi', () => ({
  chatApi: {
    getChatHistory: vi.fn(),
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

const olderMessage: ChatMessage = {
  createdAt: '2026-07-01T10:10:00.000Z',
  id: 'chat-older',
  message: '이전 메시지',
  nickname: '수빈',
  profileImage: null,
  type: 'user',
  userId: 'user-0',
};

const oldestMessage: ChatMessage = {
  createdAt: '2026-07-01T10:09:00.000Z',
  id: 'chat-oldest',
  message: '가장 이전 메시지',
  nickname: '지아',
  profileImage: null,
  type: 'user',
  userId: 'user-3',
};

const ancientMessage: ChatMessage = {
  createdAt: '2026-07-01T10:08:00.000Z',
  id: 'chat-ancient',
  message: '더 오래된 메시지',
  nickname: '도윤',
  profileImage: null,
  type: 'user',
  userId: 'user-4',
};

let intersectionObserverInstances: MockIntersectionObserver[] = [];

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    intersectionObserverInstances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function ChatScrollHarness({ onResult }: { onResult: (result: UseChatScrollResult) => void }) {
  const result = useChatScroll(roomId);
  const { scrollContainerRef, topSentinelRef } = result;
  onResult(result);

  return (
    <div data-testid="chat-scroll-container" ref={scrollContainerRef}>
      <div data-testid="chat-top-sentinel" ref={topSentinelRef} />
    </div>
  );
}

function renderChatScrollHarness(onResult: (result: UseChatScrollResult) => void) {
  const queryClient = createQueryClient();

  return render(<ChatScrollHarness onResult={onResult} />, {
    wrapper: createWrapper(queryClient),
  });
}

function stubScrollMetrics(
  element: HTMLElement,
  metrics: { clientHeight: number; scrollHeight: number; scrollTop: number },
) {
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    value: metrics.scrollTop,
    writable: true,
  });
}

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
    vi.mocked(chatApi.getChatHistory).mockReset();
    intersectionObserverInstances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.mocked(chatApi.getChatHistory).mockResolvedValue({ chats: [], hasMore: false });
    socketMock.connect.mockReturnValue({
      disconnect: vi.fn(),
      emit: socketMock.emit,
      off: socketMock.off,
      on: socketMock.on,
    });
    useChatStore.getState().clearMessages();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

  it('useChatScroll은 초기 메시지가 없으면 채팅 히스토리를 요청하지 않는다', async () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useChatScroll(roomId), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.hasNextPage).toBe(false);
    await waitFor(() => expect(chatApi.getChatHistory).not.toHaveBeenCalled());
  });

  it('useChatScroll은 disabled에서 enabled로 바뀔 때 현재 가장 오래된 메시지를 첫 커서로 사용한다', async () => {
    const queryClient = createQueryClient();
    renderHook(() => useChatScroll(roomId), {
      wrapper: createWrapper(queryClient),
    });

    expect(chatApi.getChatHistory).not.toHaveBeenCalled();

    act(() => {
      useChatStore.getState().setMessages([receivedMessage]);
    });

    await waitFor(() => {
      expect(chatApi.getChatHistory).toHaveBeenCalledWith(roomId, {
        cursorId: receivedMessage.id,
        cursorTime: receivedMessage.createdAt,
        limit: 50,
      });
    });
  });

  it('useChatScroll은 DESC 응답을 reverse한 뒤 store 앞에 붙인다', async () => {
    vi.mocked(chatApi.getChatHistory).mockResolvedValue({
      chats: [olderMessage, oldestMessage],
      hasMore: false,
    });
    const queryClient = createQueryClient();

    renderHook(() => useChatScroll(roomId), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      useChatStore.getState().setMessages([receivedMessage]);
    });

    await waitFor(() => {
      expect(useChatStore.getState().messages).toEqual([
        oldestMessage,
        olderMessage,
        receivedMessage,
      ]);
    });
  });

  it('useChatScroll은 hasMore 페이지의 마지막 메시지로 다음 커서를 계산한다', async () => {
    vi.mocked(chatApi.getChatHistory)
      .mockResolvedValueOnce({
        chats: [olderMessage, oldestMessage],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        chats: [ancientMessage],
        hasMore: false,
      });
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useChatScroll(roomId), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      useChatStore.getState().setMessages([receivedMessage]);
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.retryLoadOlderMessages();
    });

    await waitFor(() => {
      expect(chatApi.getChatHistory).toHaveBeenLastCalledWith(roomId, {
        cursorId: oldestMessage.id,
        cursorTime: oldestMessage.createdAt,
        limit: 50,
      });
    });
  });

  it('useChatScroll은 최초 메시지 로드 시 맨 아래로 스크롤한다', async () => {
    let latestResult: UseChatScrollResult | null = null;
    renderChatScrollHarness((result) => {
      latestResult = result;
    });
    const container = screen.getByTestId('chat-scroll-container');
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 700, scrollTop: 0 });

    act(() => {
      useChatStore.getState().setMessages([receivedMessage]);
    });

    await waitFor(() => {
      expect(container.scrollTop).toBe(700);
      expect(latestResult?.isScrollToBottomButtonVisible).toBe(false);
    });
  });

  it('useChatScroll은 맨 아래에서 tail append가 발생하면 자동으로 맨 아래로 이동한다', async () => {
    useChatStore.getState().setMessages([receivedMessage]);
    renderChatScrollHarness(() => undefined);
    const container = screen.getByTestId('chat-scroll-container');
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 500, scrollTop: 500 });

    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 700, scrollTop: 500 });
    act(() => {
      useChatStore.getState().addReceivedMessage({
        ...olderMessage,
        createdAt: '2026-07-01T10:13:00.000Z',
        id: 'chat-new',
      });
    });

    await waitFor(() => {
      expect(container.scrollTop).toBe(700);
    });
  });

  it('useChatScroll은 위로 스크롤한 상태의 tail append에서 위치를 유지하고 버튼을 노출한다', async () => {
    useChatStore.getState().setMessages([receivedMessage]);
    let latestResult: UseChatScrollResult | null = null;
    renderChatScrollHarness((result) => {
      latestResult = result;
    });
    const container = screen.getByTestId('chat-scroll-container');
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 700, scrollTop: 100 });
    fireEvent.scroll(container);

    await waitFor(() => expect(latestResult?.isScrollToBottomButtonVisible).toBe(true));

    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 900, scrollTop: 100 });
    act(() => {
      useChatStore.getState().addReceivedMessage({
        ...olderMessage,
        createdAt: '2026-07-01T10:13:00.000Z',
        id: 'chat-new',
      });
    });

    await waitFor(() => {
      expect(container.scrollTop).toBe(100);
      expect(latestResult?.isScrollToBottomButtonVisible).toBe(true);
    });
  });

  it('useChatScroll은 버튼 클릭 함수로 맨 아래 이동 후 버튼을 숨긴다', async () => {
    useChatStore.getState().setMessages([receivedMessage]);
    let latestResult: UseChatScrollResult | null = null;
    renderChatScrollHarness((result) => {
      latestResult = result;
    });
    const container = screen.getByTestId('chat-scroll-container');
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 700, scrollTop: 100 });
    fireEvent.scroll(container);

    await waitFor(() => expect(latestResult?.isScrollToBottomButtonVisible).toBe(true));

    act(() => {
      latestResult?.scrollToBottomNow();
    });

    await waitFor(() => {
      expect(container.scrollTop).toBe(700);
      expect(latestResult?.isScrollToBottomButtonVisible).toBe(false);
    });
  });

  it('useChatScroll은 히스토리 에러 상태에서 observer 자동 재시도를 만들지 않고 수동 재시도를 허용한다', async () => {
    vi.mocked(chatApi.getChatHistory)
      .mockRejectedValueOnce(new Error('history failed'))
      .mockResolvedValueOnce({ chats: [], hasMore: false });
    useChatStore.getState().setMessages([receivedMessage]);
    let latestResult: UseChatScrollResult | null = null;
    renderChatScrollHarness((result) => {
      latestResult = result;
    });

    await waitFor(() => expect(latestResult?.isHistoryError).toBe(true));
    expect(intersectionObserverInstances).toHaveLength(0);

    act(() => {
      latestResult?.retryLoadOlderMessages();
    });

    await waitFor(() => expect(chatApi.getChatHistory).toHaveBeenCalledTimes(2));
  });

  it('useChatScroll은 sentinel 교차 시 다음 페이지를 로드하고 prepend 후 스크롤 앵커를 복원한다', async () => {
    let resolveNextPage: (page: { chats: ChatMessage[]; hasMore: boolean }) => void = () =>
      undefined;
    vi.mocked(chatApi.getChatHistory)
      .mockResolvedValueOnce({
        chats: [olderMessage, oldestMessage],
        hasMore: true,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextPage = resolve;
          }),
      );
    useChatStore.getState().setMessages([receivedMessage]);
    renderChatScrollHarness(() => undefined);
    const container = screen.getByTestId('chat-scroll-container');
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 500, scrollTop: 100 });

    await waitFor(() => expect(intersectionObserverInstances).toHaveLength(1));

    act(() => {
      intersectionObserverInstances[0]?.trigger(true);
    });
    stubScrollMetrics(container, { clientHeight: 200, scrollHeight: 800, scrollTop: 100 });
    await act(async () => {
      resolveNextPage({ chats: [ancientMessage], hasMore: false });
    });

    await waitFor(() => {
      expect(chatApi.getChatHistory).toHaveBeenCalledTimes(2);
      expect(container.scrollTop).toBe(400);
    });
  });
});
