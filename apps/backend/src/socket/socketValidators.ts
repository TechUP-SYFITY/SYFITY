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

export function assertChangeTrackAction(
  action: unknown,
): asserts action is 'select' | 'next' | 'previous' {
  if (action !== 'select' && action !== 'next' && action !== 'previous') {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'action이 올바르지 않습니다.');
  }
}

export function assertRepeatMode(value: unknown): asserts value is 'off' | 'all' | 'one' {
  if (value !== 'off' && value !== 'all' && value !== 'one') {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'repeatMode가 올바르지 않습니다.');
  }
}

export function assertOptionalBoolean(
  value: unknown,
  field: string,
): asserts value is boolean | undefined {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, `${field}가 올바르지 않습니다.`);
  }
}

export function assertUpdateSettingsPayload(
  payload: { repeatMode?: unknown; shuffleEnabled?: unknown } | null | undefined,
): void {
  if (!payload || (payload.repeatMode === undefined && payload.shuffleEnabled === undefined)) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, '변경할 재생 설정이 필요합니다.');
  }
  if (payload.repeatMode !== undefined) assertRepeatMode(payload.repeatMode);
  assertOptionalBoolean(payload.shuffleEnabled, 'shuffleEnabled');
}
