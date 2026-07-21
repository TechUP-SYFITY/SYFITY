import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';

import { ERROR_CODES } from '@syfity/shared';

import { errorHandler } from './middlewares/error.middleware';

import { createInternalRouter } from './routes/internal.routes';

import { roomLifecycleController } from './ioc';
import { isAllowedOrigin } from './utils/cors';

// tsoa generate 실행 후 생성된다. clean checkout에서도 generate가 먼저 돌 수 있도록 require를 사용한다.
const { RegisterRoutes } = require('./generated/routes.gen');
const swaggerDocument = require('./generated/swagger.json');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1/internal', createInternalRouter(roomLifecycleController));

RegisterRoutes(app);

app.use(
  (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ValidateError) {
      res.status(422).json({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: err.message },
      });
      return;
    }

    next(err);
  },
);

app.use(errorHandler);

export default app;
