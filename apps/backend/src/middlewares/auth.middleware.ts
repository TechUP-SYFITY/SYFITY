import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { ERROR_CODES } from '@syfity/shared';

import { config } from '../config';
import { AppError } from '../errors/appError';
import { isAuthPayload } from '../utils/authPayload';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies.access_token as string | undefined;

  if (!token) {
    next(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '인증이 필요합니다.'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    if (!isAuthPayload(payload)) {
      next(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '유효하지 않은 토큰입니다.'));
      return;
    }

    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError(401, ERROR_CODES.AUTH_TOKEN_EXPIRED, '토큰이 만료되었습니다.'));
      return;
    }

    next(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '유효하지 않은 토큰입니다.'));
  }
}
