'use client';

// 채팅 Socket 이벤트와 optimistic 전송 흐름을 store에 연결한다.
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import type { GetChatsResponse } from '@syfity/shared';

import { socketClient } from '@/shared/lib/socket/socketClient';
import type { ChatMessage } from '@/shared/types/domain';

import { chatApi, type ChatHistoryCursor } from './chatApi';
import { CHAT_HISTORY_PAGE_SIZE, CHAT_MAX_MESSAGE_LENGTH } from './chatConstants';
import {
  captureScrollAnchor,
  isNearBottom,
  restoreScrollTopAfterPrepend,
  scrollToBottom,
  type ScrollAnchor,
} from './chatScrollUtils';
import { useChatStore } from './chatStore';

type ChatHistoryPage = GetChatsResponse['data'];
type ChatHistoryQueryKey = ReturnType<typeof chatQueryKeys.history>;

const EMPTY_CURSOR: ChatHistoryCursor = {
  cursorId: '',
  cursorTime: '',
};

export const chatQueryKeys = {
  all: ['chats'] as const,
  history: (roomId: string) => [...chatQueryKeys.all, roomId, 'history'] as const,
};

export const useChatSocket = (roomId: string) => {
  const addReceivedMessage = useChatStore((state) => state.addReceivedMessage);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }

    const socket = socketClient.connect();

    socket.on('chat:received', addReceivedMessage);
    socket.on('chat:system', addReceivedMessage);

    return () => {
      socket.off('chat:received', addReceivedMessage);
      socket.off('chat:system', addReceivedMessage);
    };
  }, [addReceivedMessage, roomId]);
};

export const useSendChatMessage = (
  roomId: string,
  currentUserName?: string,
  currentUserProfileImage?: string | null,
) => {
  const addOptimisticMessage = useChatStore((state) => state.addOptimisticMessage);
  const reconcileOptimisticMessage = useChatStore((state) => state.reconcileOptimisticMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const requestOutgoingScroll = useChatStore((state) => state.requestOutgoingScroll);
  const setSendError = useChatStore((state) => state.setSendError);

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();

      if (!roomId || !trimmed || trimmed.length > CHAT_MAX_MESSAGE_LENGTH) {
        return;
      }

      const tempId = `temp-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
      const optimisticMessage: ChatMessage = {
        createdAt: new Date().toISOString(),
        id: tempId,
        message: trimmed,
        nickname: currentUserName ?? null,
        profileImage: currentUserProfileImage ?? null,
        type: 'user',
        userId: null,
      };

      addOptimisticMessage(optimisticMessage);
      requestOutgoingScroll();
      setSendError(null);

      socketClient.connect().emit('chat:send', { message: trimmed, roomId }, (ack) => {
        if (ack.success && ack.data) {
          reconcileOptimisticMessage(tempId, ack.data);
          return;
        }

        removeMessage(tempId);
        setSendError(ack.success ? '메시지 전송에 실패했어요.' : ack.error.message);
      });
    },
    [
      addOptimisticMessage,
      currentUserName,
      currentUserProfileImage,
      reconcileOptimisticMessage,
      removeMessage,
      requestOutgoingScroll,
      roomId,
      setSendError,
    ],
  );

  return { sendMessage };
};

export interface UseChatScrollResult {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  topSentinelRef: RefObject<HTMLDivElement | null>;
  isFetchingNextPage: boolean;
  isHistoryError: boolean;
  hasNextPage: boolean;
  retryLoadOlderMessages: () => void;
  isScrollToBottomButtonVisible: boolean;
  scrollToBottomNow: () => void;
}

export function useChatScroll(roomId: string): UseChatScrollResult {
  const messages = useChatStore((state) => state.messages);
  const outgoingScrollRequestId = useChatStore((state) => state.outgoingScrollRequestId);
  const prependMessages = useChatStore((state) => state.prependMessages);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const syncedPageCountRef = useRef(0);
  const pendingAnchorRef = useRef<ScrollAnchor | null>(null);
  const shouldKeepBottomAfterPendingPrependRef = useRef(false);
  const isAtBottomRef = useRef(true);
  const hasScrolledToInitialBottomRef = useRef(false);
  const handledOutgoingScrollRequestRef = useRef(outgoingScrollRequestId);
  const latestOutgoingScrollRequestIdRef = useRef(outgoingScrollRequestId);
  const previousMessagesRef = useRef<ChatMessage[]>(messages);
  const latestMessagesRef = useRef<ChatMessage[]>(messages);
  const currentRoomIdRef = useRef(roomId);
  const [scrollToBottomButtonState, setScrollToBottomButtonState] = useState({
    isVisible: false,
    roomId,
  });
  const oldestMessage = messages[0];
  const hasInitialMessages = messages.length > 0;
  const isScrollToBottomButtonVisible =
    scrollToBottomButtonState.roomId === roomId && scrollToBottomButtonState.isVisible;
  const setIsScrollToBottomButtonVisible = useCallback((isVisible: boolean) => {
    setScrollToBottomButtonState({ isVisible, roomId: currentRoomIdRef.current });
  }, []);

  const historyQuery = useInfiniteQuery<
    ChatHistoryPage,
    Error,
    InfiniteData<ChatHistoryPage, ChatHistoryCursor>,
    ChatHistoryQueryKey,
    ChatHistoryCursor
  >({
    enabled: false,
    getNextPageParam: (lastPage: ChatHistoryPage) => {
      if (!lastPage.hasMore || lastPage.chats.length === 0) {
        return undefined;
      }

      const oldest = lastPage.chats[lastPage.chats.length - 1];

      return oldest ? { cursorId: oldest.id, cursorTime: oldest.createdAt } : undefined;
    },
    initialPageParam: oldestMessage
      ? { cursorId: oldestMessage.id, cursorTime: oldestMessage.createdAt }
      : EMPTY_CURSOR,
    queryFn: ({ pageParam }) =>
      chatApi.getChatHistory(roomId, {
        ...pageParam,
        limit: CHAT_HISTORY_PAGE_SIZE,
      }),
    queryKey: chatQueryKeys.history(roomId),
  });
  const { data, fetchNextPage, hasNextPage, isError, isFetchingNextPage } = historyQuery;

  useLayoutEffect(() => {
    currentRoomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    latestOutgoingScrollRequestIdRef.current = outgoingScrollRequestId;
  }, [outgoingScrollRequestId]);

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    syncedPageCountRef.current = 0;
    pendingAnchorRef.current = null;
    shouldKeepBottomAfterPendingPrependRef.current = false;
    previousMessagesRef.current = latestMessagesRef.current;
    isAtBottomRef.current = true;
    hasScrolledToInitialBottomRef.current = false;
    handledOutgoingScrollRequestRef.current = latestOutgoingScrollRequestIdRef.current;
  }, [roomId]);

  useEffect(() => {
    const pages = data?.pages;

    if (!pages || pages.length <= syncedPageCountRef.current) {
      return;
    }

    const newPages = pages.slice(syncedPageCountRef.current);
    newPages.forEach((page) => {
      prependMessages([...page.chats].reverse());
    });
    syncedPageCountRef.current = pages.length;
  }, [data?.pages, prependMessages]);

  const loadNextPageWithAnchor = useCallback(() => {
    const container = scrollContainerRef.current;

    if (container) {
      shouldKeepBottomAfterPendingPrependRef.current = false;
      pendingAnchorRef.current = captureScrollAnchor(container);
    }

    void fetchNextPage();
  }, [fetchNextPage]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const sentinel = topSentinelRef.current;
    const canFetchFirstHistoryPage = Boolean(roomId) && hasInitialMessages && !data?.pages.length;

    if (
      !container ||
      !sentinel ||
      typeof IntersectionObserver === 'undefined' ||
      (!canFetchFirstHistoryPage && !hasNextPage) ||
      isFetchingNextPage ||
      isError
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextPageWithAnchor();
        }
      },
      { root: container, threshold: 0 },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [
    data?.pages.length,
    hasInitialMessages,
    hasNextPage,
    isError,
    isFetchingNextPage,
    loadNextPageWithAnchor,
    roomId,
  ]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return undefined;
    }

    const updateBottomState = () => {
      const nearBottom = isNearBottom(container);
      isAtBottomRef.current = nearBottom;
      setIsScrollToBottomButtonVisible(!nearBottom);
    };

    container.addEventListener('scroll', updateBottomState, { passive: true });
    updateBottomState();

    return () => {
      container.removeEventListener('scroll', updateBottomState);
    };
  }, [setIsScrollToBottomButtonVisible]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      previousMessagesRef.current = messages;
      return;
    }

    const previousMessages = previousMessagesRef.current;
    const hasPendingOutgoingScroll =
      outgoingScrollRequestId !== handledOutgoingScrollRequestRef.current;
    const isPrepend =
      pendingAnchorRef.current !== null && messages[0]?.id !== previousMessages[0]?.id;
    const isTailAppend =
      messages.length > previousMessages.length && messages[0]?.id === previousMessages[0]?.id;

    if (hasPendingOutgoingScroll) {
      if (pendingAnchorRef.current) {
        shouldKeepBottomAfterPendingPrependRef.current = true;
      }
      scrollToBottom(container);
      isAtBottomRef.current = true;
      handledOutgoingScrollRequestRef.current = outgoingScrollRequestId;
      setIsScrollToBottomButtonVisible(false);
    } else if (isPrepend && pendingAnchorRef.current) {
      if (shouldKeepBottomAfterPendingPrependRef.current) {
        scrollToBottom(container);
      } else {
        restoreScrollTopAfterPrepend(container, pendingAnchorRef.current);
      }
      pendingAnchorRef.current = null;
      shouldKeepBottomAfterPendingPrependRef.current = false;
    } else if (!hasScrolledToInitialBottomRef.current && messages.length > 0) {
      scrollToBottom(container);
      isAtBottomRef.current = true;
      hasScrolledToInitialBottomRef.current = true;
      setIsScrollToBottomButtonVisible(false);
    } else if (isTailAppend) {
      if (isAtBottomRef.current) {
        scrollToBottom(container);
        isAtBottomRef.current = true;
        setIsScrollToBottomButtonVisible(false);
      } else if (!isNearBottom(container)) {
        setIsScrollToBottomButtonVisible(true);
      }
    }

    previousMessagesRef.current = messages;
  }, [messages, outgoingScrollRequestId, setIsScrollToBottomButtonVisible]);

  const scrollToBottomNow = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    if (pendingAnchorRef.current) {
      shouldKeepBottomAfterPendingPrependRef.current = true;
    }
    scrollToBottom(container);
    isAtBottomRef.current = true;
    setIsScrollToBottomButtonVisible(false);
  }, [setIsScrollToBottomButtonVisible]);

  return {
    hasNextPage,
    isFetchingNextPage,
    isHistoryError: isError,
    isScrollToBottomButtonVisible,
    retryLoadOlderMessages: loadNextPageWithAnchor,
    scrollContainerRef,
    scrollToBottomNow,
    topSentinelRef,
  };
}
