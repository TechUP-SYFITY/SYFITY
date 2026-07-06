import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { SocketAckError } from '../types/socket';

export function toSocketAckError(err: unknown): SocketAckError {
  if (err instanceof AppError) {
    return { code: err.code, message: err.message };
  }

  return {
    code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    message: '알 수 없는 오류가 발생했습니다.',
  };
}
