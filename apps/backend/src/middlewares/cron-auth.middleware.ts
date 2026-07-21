import type { NextFunction, Request, Response } from 'express';

import { ERROR_CODES } from '@syfity/shared';

import { config } from '../config';
import { AppError } from '../errors/appError';

export function cronAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token || token !== config.cron.secret) {
    next(new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, '유효하지 않은 요청입니다.'));
    return;
  }
  next();
}
