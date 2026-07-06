import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { toSocketAckError } from './socketError';
import { AppError } from '../errors/appError';

describe('toSocketAckError', () => {
  it('AppError의 code와 message를 반환한다', () => {
    const error = new AppError(
      403,
      ERROR_CODES.ROOM_ACCESS_DENIED,
      'Room 참여자만 접근할 수 있습니다.',
    );

    expect(toSocketAckError(error)).toEqual({
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
      message: 'Room 참여자만 접근할 수 있습니다.',
    });
  });

  it('일반 Error는 SERVER_INTERNAL_ERROR로 변환한다', () => {
    expect(toSocketAckError(new Error('boom'))).toEqual({
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
      message: '알 수 없는 오류가 발생했습니다.',
    });
  });

  it('임의 값도 SERVER_INTERNAL_ERROR로 변환한다', () => {
    expect(toSocketAckError('oops')).toEqual({
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
      message: '알 수 없는 오류가 발생했습니다.',
    });
  });
});
