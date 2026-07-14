'use client';

// Room 채팅 패널의 메시지 목록과 입력 영역을 조립한다.

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui';
import type { ChatMessage } from '@/shared/types/domain';

import { ChatHistoryStatus } from './ChatHistoryStatus';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatSystemMessage } from './ChatSystemMessage';
import { ScrollToBottomButton } from './ScrollToBottomButton';
import { useChatScroll, type UseChatScrollResult } from '../hooks/useChatScroll';
import { useSendChatMessage } from '../hooks/useSendChatMessage';
import { useChatStore } from '../store/chatStore';

interface ChatPanelProps {
  chatScrollResult?: UseChatScrollResult;
  currentUserName?: string;
  currentUserProfileImage?: string | null;
  messages?: ChatMessage[];
  roomId: string;
}

export function ChatPanel({
  chatScrollResult,
  currentUserName,
  currentUserProfileImage,
  messages,
  roomId,
}: ChatPanelProps) {
  const storeMessages = useChatStore((state) => state.messages);
  const sendError = useChatStore((state) => state.sendError);
  const { sendMessage } = useSendChatMessage(roomId, currentUserName, currentUserProfileImage);
  const hookChatScrollResult = useChatScroll(roomId);
  const {
    isFetchingNextPage,
    isHistoryError,
    isScrollToBottomButtonVisible,
    retryLoadOlderMessages,
    scrollContainerRef,
    scrollToBottomNow,
    topSentinelRef,
  } = chatScrollResult ?? hookChatScrollResult;
  const visibleMessages = messages ?? storeMessages;

  return (
    <aside className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="hidden h-12 shrink-0 items-center border-b border-border px-4 xl:flex">
        <h2 className="text-xs font-semibold text-muted-foreground">채팅</h2>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          className="scrollbar-none h-full min-h-0 overflow-y-auto px-6 py-5"
        >
          <div
            data-testid="chat-message-stack"
            className="flex min-h-full flex-col justify-end gap-4"
          >
            <div ref={topSentinelRef} className="h-px shrink-0" aria-hidden />
            <ChatHistoryStatus
              isLoading={isFetchingNextPage}
              isError={isHistoryError}
              onRetry={retryLoadOlderMessages}
            />
            {visibleMessages.map((chat) =>
              chat.type === 'system' ? (
                <ChatSystemMessage key={chat.id} chat={chat} />
              ) : (
                <ChatMessageItem key={chat.id} chat={chat} />
              ),
            )}
          </div>
        </div>
        <ScrollToBottomButton
          isVisible={isScrollToBottomButtonVisible}
          onClick={scrollToBottomNow}
        />
      </div>
      <div className="flex shrink-0 items-start gap-3 border-t border-border px-5 py-3 xl:gap-2 xl:p-4">
        <Avatar size="sm" className="mt-2 size-6 text-xs xl:hidden">
          <AvatarImage src={currentUserProfileImage ?? undefined} alt={currentUserName ?? '나'} />
          <AvatarFallback>{(currentUserName ?? 'S').slice(0, 1)}</AvatarFallback>
        </Avatar>
        <ChatInputForm errorMessage={sendError ?? undefined} onSubmit={sendMessage} />
      </div>
    </aside>
  );
}
