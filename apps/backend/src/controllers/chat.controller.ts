import type { Request as ExRequest } from 'express';
import { Get, Path, Query, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import type { GetChatsResponse } from '@syfity/shared';

import type { ChatService } from '../services/chat.service';

type ChatControllerService = Pick<ChatService, 'getChats'>;

@Route('rooms')
@Tags('Chat')
@Security('jwt')
export class ChatController {
  constructor(private readonly chatService: ChatControllerService) {}

  /**
   * 채팅 이전 메시지 로드. 커서 기반 페이지네이션.
   * @param roomId Room 고유 식별자
   * @param cursorTime 커서 기준 시각 (ISO 8601)
   * @param cursorId 커서 기준 메시지 ID
   * @param limit 로드 개수 (기본값: 50)
   * @isInt limit
   * @minimum limit 1
   * @maximum limit 100
   */
  @Get('{roomId}/chats')
  @SuccessResponse(200, 'OK')
  async getChats(
    @Path() roomId: string,
    @Request() req: ExRequest,
    @Query() cursorTime: string,
    @Query() cursorId: string,
    @Query() limit?: number,
  ): Promise<GetChatsResponse> {
    const userId = req.user!.id;
    const { chats, hasMore } = await this.chatService.getChats({
      roomId,
      cursorTime,
      cursorId,
      limit,
      userId,
    });

    return {
      success: true,
      data: {
        chats: chats.map((chat) => ({
          id: chat.id,
          userId: chat.userId,
          nickname: chat.nickname,
          type: chat.type,
          message: chat.message,
          createdAt: chat.createdAt.toISOString(),
        })),
        hasMore,
      },
    };
  }
}
