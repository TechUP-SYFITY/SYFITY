import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';

import { config } from '../config';

interface SocketAuthError extends Error {
  data: {
    code: string;
  };
}

function toSocketError(code: string, message: string): SocketAuthError {
  return Object.assign(new Error(message), { data: { code } });
}

function isSocketAuthPayload(payload: unknown): payload is { id: string; email: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'email' in payload &&
    typeof payload.id === 'string' &&
    typeof payload.email === 'string'
  );
}

export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const rawCookie = socket.handshake.headers.cookie ?? '';
  const token = parseCookie(rawCookie).access_token;

  if (!token) {
    next(toSocketError('AUTH_UNAUTHORIZED', '인증이 필요합니다.'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    if (!isSocketAuthPayload(payload)) {
      next(toSocketError('AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
      return;
    }

    socket.data.userId = payload.id;
    socket.data.email = payload.email;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(toSocketError('AUTH_TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
      return;
    }

    next(toSocketError('AUTH_UNAUTHORIZED', '유효하지 않은 토큰입니다.'));
  }
}
