import 'dotenv/config';
import { createServer } from 'http';

import { Server } from 'socket.io';

import app from './app';
import { config } from './config';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO 초기화 (구현 단계에서 추가)
// initSocket(io);

httpServer.listen(config.port, () => {
  console.log(`서버 실행 중: http://localhost:${config.port}`);
});

export { io };
