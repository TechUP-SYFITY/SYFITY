import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const status = err.status ?? 500;
  const code = err.code ?? 'SERVER_INTERNAL_ERROR';
  const message = err.message ?? '서버 오류가 발생했습니다.';

  res.status(status).json({
    success: false,
    error: { code, message },
  });
}
