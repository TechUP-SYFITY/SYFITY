import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { errorHandler } from './middlewares/error.middleware';

import { config } from './config';

const app = express();

// 미들웨어
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

// 라우터 (구현 단계에서 추가)

// 전역 에러 미들웨어 (항상 마지막에)
app.use(errorHandler);

export default app;
