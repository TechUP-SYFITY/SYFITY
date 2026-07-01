import { describe, expect, it } from 'vitest';

import { AppError } from './appError';

describe('AppError', () => {
  it('status, code, message를 보존한다', () => {
    const error = new AppError(404, 'NOT_FOUND', '대상을 찾을 수 없습니다.');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('대상을 찾을 수 없습니다.');
  });
});
