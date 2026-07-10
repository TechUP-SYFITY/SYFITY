import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';

export function assertRoomId(roomId: unknown): asserts roomId is string {
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'roomId가 필요합니다.');
  }
}

export function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, `${field}가 올바르지 않습니다.`);
  }
}

export function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, `${field}가 필요합니다.`);
  }
}
