import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseChatScrollResult } from '../chatHooks';
import { useChatScroll, useSendChatMessage } from '../chatHooks';
import { useChatStore } from '../chatStore';
import { ChatPanel } from './ChatPanel';

vi.mock('../chatHooks', () => ({
  useChatScroll: vi.fn(),
  useSendChatMessage: vi.fn(),
}));

const sendMessage = vi.fn();
const retryLoadOlderMessages = vi.fn();
const scrollToBottomNow = vi.fn();

function createChatScrollResult(override: Partial<UseChatScrollResult> = {}): UseChatScrollResult {
  return {
    hasNextPage: false,
    isFetchingNextPage: false,
    isHistoryError: false,
    isScrollToBottomButtonVisible: false,
    retryLoadOlderMessages,
    scrollContainerRef: createRef<HTMLDivElement>(),
    scrollToBottomNow,
    topSentinelRef: createRef<HTMLDivElement>(),
    ...override,
  };
}

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clearMessages();
    vi.mocked(useSendChatMessage).mockReturnValue({ sendMessage });
    vi.mocked(useChatScroll).mockReturnValue(createChatScrollResult());
  });

  afterEach(() => {
    cleanup();
  });

  it('store 메시지와 입력 폼을 렌더링한다', () => {
    useChatStore.getState().setMessages([
      {
        createdAt: '2026-07-01T10:12:00.000Z',
        id: 'chat-1',
        message: '안녕하세요.',
        nickname: '민지',
        profileImage: null,
        type: 'user',
        userId: 'user-1',
      },
    ]);

    render(<ChatPanel roomId="room-1" currentUserName="민지" />);

    expect(screen.getByText('안녕하세요.')).toBeInTheDocument();
    expect(screen.getByLabelText('채팅 메시지 입력')).toBeInTheDocument();
  });

  it('이전 메시지 로딩 상태를 표시한다', () => {
    vi.mocked(useChatScroll).mockReturnValue(createChatScrollResult({ isFetchingNextPage: true }));

    render(<ChatPanel roomId="room-1" />);

    expect(screen.getByText('이전 메시지를 불러오는 중...')).toBeInTheDocument();
  });

  it('이전 메시지 에러 상태에서 재시도 클릭을 전달한다', () => {
    vi.mocked(useChatScroll).mockReturnValue(createChatScrollResult({ isHistoryError: true }));

    render(<ChatPanel roomId="room-1" />);
    fireEvent.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(retryLoadOlderMessages).toHaveBeenCalledTimes(1);
  });

  it('맨 아래로 이동 버튼 클릭을 전달한다', () => {
    vi.mocked(useChatScroll).mockReturnValue(
      createChatScrollResult({ isScrollToBottomButtonVisible: true }),
    );

    render(<ChatPanel roomId="room-1" />);
    fireEvent.click(screen.getByRole('button', { name: '맨 아래로 이동' }));

    expect(scrollToBottomNow).toHaveBeenCalledTimes(1);
  });
});
