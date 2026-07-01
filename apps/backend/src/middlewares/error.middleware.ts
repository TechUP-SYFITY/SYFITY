import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/appError';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: 'SERVER_INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
  });
}
