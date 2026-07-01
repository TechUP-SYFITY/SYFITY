import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { config } from './config';
import { AppError } from './errors/appError';

export function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<{ id: string; email: string }> {
  if (securityName !== 'jwt') {
    return Promise.reject(new AppError(401, 'AUTH_UNAUTHORIZED', '알 수 없는 보안 스킴입니다.'));
  }

  const token = request.cookies?.access_token as string | undefined;
  if (!token) {
    return Promise.reject(new AppError(401, 'AUTH_UNAUTHORIZED', '인증이 필요합니다.'));
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.accessSecret, (err, payload) => {
      if (err instanceof jwt.TokenExpiredError) {
        reject(new AppError(401, 'AUTH_TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
        return;
      }

      if (err) {
        reject(new AppError(401, 'AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
        return;
      }

      const verifiedPayload = payload as { id: string; email: string };
      const user = { id: verifiedPayload.id, email: verifiedPayload.email };
      request.user = user;
      resolve(user);
    });
  });
}
