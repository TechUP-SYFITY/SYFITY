import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { cronAuth } from './cron-auth.middleware';
import { config } from '../config';

function makeRequest(authorization?: string): Request {
  return { headers: { authorization } } as Request;
}

describe('cronAuth', () => {
  it('올바른 Bearer secret을 통과시킨다', () => {
    const next = vi.fn() as unknown as NextFunction;

    cronAuth(makeRequest(`Bearer ${config.cron.secret}`), {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it.each([undefined, 'Bearer wrong-secret', 'Basic token'])('잘못된 인증을 거부한다', (header) => {
    const next = vi.fn() as unknown as NextFunction;

    cronAuth(makeRequest(header), {} as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, code: 'AUTH_FORBIDDEN' }),
    );
  });
});
