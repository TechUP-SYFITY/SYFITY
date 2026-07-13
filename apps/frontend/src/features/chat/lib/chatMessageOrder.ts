import type { ChatMessage } from '@/shared/types/domain';

export function sortChatMessagesAscending(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const createdAtOrder = a.createdAt.localeCompare(b.createdAt);

    return createdAtOrder === 0 ? a.id.localeCompare(b.id) : createdAtOrder;
  });
}
