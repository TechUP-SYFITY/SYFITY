import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { IRoomRepository } from '../types/room';
import { assertActiveRoomMember } from '../utils/roomAccess';

const DEFAULT_LIMIT = 50;

export class ChatService {
  constructor(
    private readonly chatRepo: IChatRepository,
    private readonly roomRepo: Pick<IRoomRepository, 'findRoomById' | 'findMembership'>,
  ) {}

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
