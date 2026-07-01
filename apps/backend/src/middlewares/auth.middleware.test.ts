import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppError } from '../errors/appError';

const JWT_SECRET = 'test-access-secret';

describe('authenticate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', JWT_SECRET);
  });

  it('유효한 access_token 쿠키를 req.user로 주입한다', async () => {
    const { authenticate } = await import('./auth.middleware');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const req = { cookies: { access_token: token } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);

    expect(req.user).toEqual({ id: 'user-id', email: 'user@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('쿠키가 없으면 AUTH_UNAUTHORIZED를 next로 전달한다', async () => {
    const { authenticate } = await import('./auth.middleware');
    const req = { cookies: {} } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);

    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError;
    expect(error.code).toBe('AUTH_UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('만료된 토큰이면 AUTH_TOKEN_EXPIRED를 next로 전달한다', async () => {
    const { authenticate } = await import('./auth.middleware');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const req = { cookies: { access_token: token } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    authenticate(req, res, next);

    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError;
    expect(error.code).toBe('AUTH_TOKEN_EXPIRED');
    expect(error.status).toBe(401);
  });
});
