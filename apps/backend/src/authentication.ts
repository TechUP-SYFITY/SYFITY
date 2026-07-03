import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { ERROR_CODES } from '@syfity/shared';

import { prisma } from './lib/prisma';

import { UserRepository } from './repositories/user.repository';

import { config } from './config';
import { AppError } from './errors/appError';
import { isAuthPayload } from './utils/authPayload';

const userRepository = new UserRepository(prisma);

export function expressAuthentication(
  request: Request,
  securityName: string,
): Promise<{ id: string; email: string }> {
  if (securityName !== 'jwt') {
    return Promise.reject(
      new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '알 수 없는 보안 스킴입니다.'),
    );
  }

  const token = request.cookies?.access_token as string | undefined;
  if (!token) {
    return Promise.reject(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '인증이 필요합니다.'));
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.accessSecret, async (err, payload) => {
      if (err instanceof jwt.TokenExpiredError) {
        reject(new AppError(401, ERROR_CODES.AUTH_TOKEN_EXPIRED, '토큰이 만료되었습니다.'));
        return;
      }

      if (err) {
        reject(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '유효하지 않은 토큰입니다.'));
        return;
      }

      if (!isAuthPayload(payload)) {
        reject(new AppError(401, ERROR_CODES.AUTH_UNAUTHORIZED, '유효하지 않은 토큰입니다.'));
        return;
      }

      try {
        const storedUser = await userRepository.findUserById(payload.id);
        if (!storedUser) {
          reject(new AppError(404, ERROR_CODES.AUTH_USER_NOT_FOUND, '사용자를 찾을 수 없습니다.'));
          return;
        }

        const user = { id: payload.id, email: payload.email };
        request.user = user;
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  });
}
