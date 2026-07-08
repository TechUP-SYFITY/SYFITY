import 'dotenv/config';
import { createServer } from 'http';

import { Server } from 'socket.io';

import { setIo } from './lib/io';
import { prisma } from './lib/prisma';

import { startPlaybackTick, stopPlaybackTick } from './socket/handlers/tick.handler';

import app from './app';
import { config } from './config';
import { initSocket } from './socket';
import { isAllowedOrigin } from './utils/cors';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setIo(io);
initSocket(io);
const playbackTickTimer = startPlaybackTick(io);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`서버 실행 중: http://localhost:${config.port}`);
});

let isShuttingDown = false;
function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`${signal} 수신, 서버 종료 중...`);

  stopPlaybackTick(playbackTickTimer);
  io.close();
  httpServer.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
