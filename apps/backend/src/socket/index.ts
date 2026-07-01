import type { Server } from 'socket.io';

import { registerChatHandlers } from './handlers/chat.handler';
import { registerPlaybackHandlers } from './handlers/playback.handler';
import { registerPlaylistHandlers } from './handlers/playlist.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerRoomHandlers } from './handlers/room.handler';
import { socketAuth } from './socketAuth';

export function initSocket(io: Server): void {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[Socket] 연결: socketId=${socket.id}, userId=${socket.data.userId}`);

    registerRoomHandlers(io, socket);
    registerPlaybackHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerPlaylistHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.log(
        `[Socket] 해제: socketId=${socket.id}, userId=${socket.data.userId}, reason=${reason}`,
      );
    });
  });
}
