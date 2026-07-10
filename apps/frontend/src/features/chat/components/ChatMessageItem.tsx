import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui';
import type { ChatMessage } from '@/shared/types/domain';

import { formatChatTime } from './chatFormatters';

interface ChatMessageItemProps {
  chat: ChatMessage;
}

export function ChatMessageItem({ chat }: ChatMessageItemProps) {
  return (
    <div className="flex items-start gap-3 py-0.5">
      <Avatar size="sm" className="size-6 text-xs">
        <AvatarImage src={chat.profileImage ?? undefined} alt={chat.nickname ?? '참여자'} />
        <AvatarFallback>{(chat.nickname ?? 'S').slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">
          {chat.nickname}
          <span className="ml-1 font-normal text-muted-foreground">
            {formatChatTime(chat.createdAt)}
          </span>
        </p>
        <p className="mt-1 text-sm leading-5 break-words text-foreground">{chat.message}</p>
      </div>
    </div>
  );
}
