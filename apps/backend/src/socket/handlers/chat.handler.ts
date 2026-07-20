import type { Server, Socket } from 'socket.io';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../../errors/appError';
import { chatService as defaultChatService } from '../../ioc';
import { logger } from '../../lib/logger';
import type { ChatService } from '../../services/chat.service';
import type { ChatSendAck, ChatSendPayload } from '../../types/socket';
import { toChatReceivedPayload } from '../../utils/chatPayload';
import { toSocketAckError } from '../socketError';

type ChatHandlerService = Pick<ChatService, 'sendMessage'>;
type ChatHandlerDeps = {
  chatService: ChatHandlerService;
};

function assertChatSendPayload(payload: unknown): asserts payload is ChatSendPayload {
  const candidate = payload as Partial<ChatSendPayload> | null | undefined;
  if (typeof candidate?.roomId !== 'string' || candidate.roomId.length === 0) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'roomId가 필요합니다.');
  }
  if (typeof candidate?.message !== 'string') {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'message가 필요합니다.');
  }
}

export function registerChatHandlers(
  io: Server,
  socket: Socket,
  deps: ChatHandlerDeps = { chatService: defaultChatService },
): void {
  const { chatService } = deps;

  socket.on(
    'chat:send',
    async (payload: ChatSendPayload | null | undefined, ack: (response: ChatSendAck) => void) => {
      try {
        assertChatSendPayload(payload);
        const { roomId, message } = payload;
        const userId = socket.data.userId;

        const record = await chatService.sendMessage({ roomId, userId, message });
        io.to(`room:${roomId}`).emit('chat:received', toChatReceivedPayload(record));

        ack({ success: true, data: toChatReceivedPayload(record) });
      } catch (err) {
        logger.error(
          { err, userId: socket.data.userId, roomId: payload?.roomId },
          '[chat:send] 처리 실패',
        );
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );
}
