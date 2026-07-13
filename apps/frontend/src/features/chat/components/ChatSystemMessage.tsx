import type { ChatMessage } from '@/shared/types/domain';

interface ChatSystemMessageProps {
  chat: ChatMessage;
}

export function ChatSystemMessage({ chat }: ChatSystemMessageProps) {
  return (
    <p className="mx-auto w-fit rounded-full bg-input px-3 py-1 text-xs text-muted-foreground">
      {chat.message}
    </p>
  );
}
