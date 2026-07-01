import 'dotenv/config';
import { createServer } from 'http';

import { Server } from 'socket.io';

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

initSocket(io);

httpServer.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`서버 실행 중: http://localhost:${config.port}`);
});
