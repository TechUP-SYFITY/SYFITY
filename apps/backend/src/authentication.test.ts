import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppError } from './errors/appError';

const JWT_SECRET = 'test-access-secret';

describe('expressAuthentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', JWT_SECRET);
  });

  it('유효한 access_token 쿠키를 검증하고 user를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
    });
    expect(request.user).toEqual({ id: 'user-id', email: 'user@example.com' });
  });

  it('쿠키가 없으면 AUTH_UNAUTHORIZED를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const request = { cookies: {} } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_UNAUTHORIZED',
    } satisfies Partial<AppError>);
  });

  it('만료된 토큰이면 AUTH_TOKEN_EXPIRED를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_TOKEN_EXPIRED',
    } satisfies Partial<AppError>);
  });
});
