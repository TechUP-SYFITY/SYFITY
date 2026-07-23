import type { Server } from 'socket.io';

import { registerChatHandlers } from './handlers/chat.handler';
import { registerPlaybackHandlers } from './handlers/playback.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerRoomHandlers } from './handlers/room.handler';
import { socketAuth } from './socketAuth';
import { logger } from '../lib/logger';

export function initSocket(io: Server): void {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, '[Socket] 연결');
    socket.join(`user:${socket.data.userId}`);

    registerRoomHandlers(io, socket);
    registerPlaybackHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId: socket.data.userId, reason }, '[Socket] 해제');
    });
  });
}
