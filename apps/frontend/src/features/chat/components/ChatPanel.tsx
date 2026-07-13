'use client';

// Room 채팅 패널의 메시지 목록과 입력 영역을 조립한다.

import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui';
import type { ChatMessage } from '@/shared/types/domain';

import { useSendChatMessage } from '../chatHooks';
import { useChatStore } from '../chatStore';
import { ChatInputForm } from './ChatInputForm';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatSystemMessage } from './ChatSystemMessage';

interface ChatPanelProps {
  currentUserName?: string;
  currentUserProfileImage?: string | null;
  messages?: ChatMessage[];
  roomId: string;
}

export function ChatPanel({
  currentUserName,
  currentUserProfileImage,
  messages,
  roomId,
}: ChatPanelProps) {
  const storeMessages = useChatStore((state) => state.messages);
  const sendError = useChatStore((state) => state.sendError);
  const { sendMessage } = useSendChatMessage(roomId, currentUserName, currentUserProfileImage);
  const visibleMessages = messages ?? storeMessages;

  return (
    <aside className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="hidden h-12 shrink-0 items-center border-b border-border px-4 xl:flex">
        <h2 className="text-xs font-semibold text-muted-foreground">채팅</h2>
      </div>
      <div className="min-h-0 flex-1 scrollbar-none space-y-4 overflow-y-auto px-6 py-5">
        {visibleMessages.map((chat) =>
          chat.type === 'system' ? (
            <ChatSystemMessage key={chat.id} chat={chat} />
          ) : (
            <ChatMessageItem key={chat.id} chat={chat} />
          ),
        )}
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
