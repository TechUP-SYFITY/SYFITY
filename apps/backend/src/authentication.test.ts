import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppError } from './errors/appError';

const JWT_SECRET = 'test-access-secret';
const USER_ID = '11111111-1111-4111-8111-111111111111';

let findUserByIdMock: ReturnType<typeof vi.fn>;

describe('expressAuthentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', JWT_SECRET);
    findUserByIdMock = vi.fn().mockResolvedValue({
      id: USER_ID,
      email: 'user@example.com',
      nickname: 'Alice',
      profileImage: null,
    });
    vi.doMock('./lib/prisma', () => ({ prisma: {} }));
    vi.doMock('./repositories/user.repository', () => ({
      UserRepository: vi.fn().mockImplementation(function MockUserRepository() {
        return {
          findUserById: findUserByIdMock,
        };
      }),
    }));
  });

  it('유효한 access_token 쿠키를 검증하고 user를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET);
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).resolves.toEqual({
      id: USER_ID,
      email: 'user@example.com',
    });
    expect(request.user).toEqual({ id: USER_ID, email: 'user@example.com' });
    expect(findUserByIdMock).toHaveBeenCalledWith(USER_ID);
  });

  it('유효한 토큰이지만 DB에 사용자가 없으면 AUTH_USER_NOT_FOUND를 반환한다', async () => {
    findUserByIdMock.mockResolvedValue(null);
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET);
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 404,
      code: 'AUTH_USER_NOT_FOUND',
    } satisfies Partial<AppError>);
    expect(request.user).toBeUndefined();
  });

  it('쿠키가 없으면 AUTH_UNAUTHORIZED를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const request = { cookies: {} } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_UNAUTHORIZED',
    } satisfies Partial<AppError>);
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it('만료된 토큰이면 AUTH_TOKEN_EXPIRED를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: USER_ID, email: 'user@example.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_TOKEN_EXPIRED',
    } satisfies Partial<AppError>);
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it('payload id가 UUID가 아니면 AUTH_UNAUTHORIZED를 반환한다', async () => {
    const { expressAuthentication } = await import('./authentication');
    const token = jwt.sign({ id: 'user-id', email: 'user@example.com' }, JWT_SECRET);
    const request = { cookies: { access_token: token } } as unknown as Request;

    await expect(expressAuthentication(request, 'jwt')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_UNAUTHORIZED',
    } satisfies Partial<AppError>);
    expect(request.user).toBeUndefined();
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });
});
