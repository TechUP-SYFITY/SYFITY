import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import {
  assertFiniteNumber,
  assertNonEmptyString,
  assertRepeatMode,
  assertRoomId,
  assertUpdateSettingsPayload,
} from './socketValidators';

describe('socketValidators', () => {
  it('assertRoomId는 비어 있지 않은 문자열만 통과시킨다', () => {
    expect(() => assertRoomId('room-1')).not.toThrow();
    expect(() => assertRoomId(undefined)).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    expect(() => assertRoomId('')).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
  });

  it('assertFiniteNumber는 0 이상의 유한한 숫자만 통과시킨다', () => {
    expect(() => assertFiniteNumber(30, 'currentTime')).not.toThrow();
    expect(() => assertFiniteNumber('30', 'currentTime')).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    expect(() => assertFiniteNumber(-1, 'currentTime')).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    expect(() => assertFiniteNumber(Number.NaN, 'currentTime')).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    expect(() => assertFiniteNumber(Number.POSITIVE_INFINITY, 'currentTime')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
  });

  it('assertNonEmptyString은 비어 있지 않은 문자열만 통과시킨다', () => {
    expect(() => assertNonEmptyString('playlist-item-1', 'playlistItemId')).not.toThrow();
    expect(() => assertNonEmptyString('', 'playlistItemId')).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.VALIDATION_ERROR,
      }),
    );
    expect(() => assertNonEmptyString(undefined, 'playlistItemId')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
  });

  it('반복 모드와 재생 설정 변경 payload를 엄격히 검증한다', () => {
    expect(() => assertRepeatMode('all')).not.toThrow();
    expect(() => assertRepeatMode('invalid')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
    expect(() => assertUpdateSettingsPayload({ repeatMode: 'one' })).not.toThrow();
    expect(() => assertUpdateSettingsPayload({ shuffleEnabled: true })).not.toThrow();
    expect(() => assertUpdateSettingsPayload({})).toThrow(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
    expect(() => assertUpdateSettingsPayload({ shuffleEnabled: 'true' })).toThrow(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
  });
});
