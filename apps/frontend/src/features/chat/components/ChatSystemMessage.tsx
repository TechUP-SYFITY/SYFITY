import type { ChatMessage } from '@/shared/types/domain';

interface ChatSystemMessageProps {
  chat: ChatMessage;
}

export function ChatSystemMessage({ chat }: ChatSystemMessageProps) {
  return (
    <p className="mx-auto w-fit max-w-full rounded-full bg-input px-3 py-1 text-xs break-words text-muted-foreground">
      {chat.message}
    </p>
  );
}
