import type { NextFunction, Request, Response } from 'express';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import { logger } from '../lib/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error({ err, method: req.method, path: req.path }, '[errorHandler] 처리되지 않은 에러');

  res.status(500).json({
    success: false,
    error: { code: ERROR_CODES.SERVER_INTERNAL_ERROR, message: '서버 오류가 발생했습니다.' },
  });
}
