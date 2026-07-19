import type { ChatMessageRecord } from '../types/chat';
import type { ChatReceivedPayload, ChatSystemPayload } from '../types/socket';

export function toChatReceivedPayload(record: ChatMessageRecord): ChatReceivedPayload {
  if (record.type !== 'user' || record.userId === null) {
    throw new Error('toChatReceivedPayload는 type=user 메시지에만 사용할 수 있습니다.');
  }

  return {
    id: record.id,
    userId: record.userId,
    nickname: record.nickname,
    profileImage: record.profileImage,
    type: 'user',
    message: record.message,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toChatSystemPayload(record: ChatMessageRecord): ChatSystemPayload {
  return {
    id: record.id,
    userId: null,
    nickname: null,
    profileImage: null,
    type: 'system',
    message: record.message,
    createdAt: record.createdAt.toISOString(),
  };
}
