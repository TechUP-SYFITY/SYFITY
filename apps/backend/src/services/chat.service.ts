import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import { logger } from '../lib/logger';
import type { ChatMessageRecord, ChatRecord, IChatRepository } from '../types/chat';
import type { IRoomRepository } from '../types/room';
import { assertActiveRoomMember } from '../utils/roomAccess';

const DEFAULT_LIMIT = 50;
const MAX_MESSAGE_LENGTH = 300;

export class ChatService {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly roomRepo: Pick<
      IRoomRepository,
      'findRoomById' | 'findMembership' | 'touchLastActivity'
    >,
  ) {}

  async sendMessage(params: {
    roomId: string;
    userId: string;
    message: string;
  }): Promise<ChatMessageRecord> {
    const trimmed = params.message.trim();
    if (trimmed.length === 0) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '메시지 내용이 필요합니다.');
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(
        400,
        ERROR_CODES.VALIDATION_ERROR,
        `메시지는 ${MAX_MESSAGE_LENGTH}자를 초과할 수 없습니다.`,
      );
    }

    await assertActiveRoomMember(this.roomRepo, params.roomId, params.userId);

    const record = await this.chatRepo.createMessage({
      roomId: params.roomId,
      userId: params.userId,
      type: 'user',
      message: trimmed,
    });

    try {
      await this.roomRepo.touchLastActivity(params.roomId);
    } catch (err) {
      // 메시지 저장은 이미 성공했으므로 lastActivity 갱신 실패가 실시간 전달을 막지 않게 한다.
      logger.error(
        { err, roomId: params.roomId },
        '[ChatService.sendMessage] Room lastActivity 갱신 실패',
      );
    }

    return record;
  }

  async getChats(params: {
    roomId: string;
    cursorTime: string;
    cursorId: string;
    limit?: number;
    userId: string;
  }): Promise<{ chats: ChatRecord[]; hasMore: boolean }> {
    const limit = params.limit ?? DEFAULT_LIMIT;
    const cursorDate = new Date(params.cursorTime);

    if (Number.isNaN(cursorDate.getTime())) {
      throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '유효하지 않은 cursorTime 형식입니다.');
    }

    await assertActiveRoomMember(this.roomRepo, params.roomId, params.userId);

    const rows = await this.chatRepo.findChatsByCursor({
      roomId: params.roomId,
      cursorTime: cursorDate,
      cursorId: params.cursorId,
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;

    return {
      chats: hasMore ? rows.slice(0, limit) : rows,
      hasMore,
    };
  }
}
