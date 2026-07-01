import type { Request as ExRequest } from 'express';
import type { TsoaResponse } from 'tsoa';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthTokens } from '../services/auth.service';
import type { UserRecord } from '../types/auth';

const userRecord: UserRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: null,
  refreshToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function makeAuthService() {
  return {
    getAuthorizationUrl: vi.fn().mockReturnValue('https://accounts.google.com/oauth'),
    handleCallback: vi.fn().mockResolvedValue({
      user: userRecord,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    } satisfies AuthTokens),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRequest(): ExRequest {
  return {
    user: { id: 'user-id', email: 'alice@example.com' },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  } as unknown as ExRequest;
}

describe('AuthController', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('CLIENT_URL', 'http://localhost:3000');
  });

  it('GET /auth/google은 Google 인증 URL로 리다이렉트한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.redirectToGoogle('/room/abc', redirect);

    expect(authService.getAuthorizationUrl).toHaveBeenCalledWith('/room/abc');
    expect(redirectMock).toHaveBeenCalledWith(302, undefined, {
      Location: 'https://accounts.google.com/oauth',
    });
  });

  it('콜백 성공 시 httpOnly 쿠키를 설정하고 state로 리다이렉트한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback('valid-code', '/room/abc', req, redirect);

    expect(authService.handleCallback).toHaveBeenCalledWith('valid-code');
    expect(req.res!.cookie).toHaveBeenCalledWith('access_token', 'access-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    expect(req.res!.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
    });
    expect(redirectMock).toHaveBeenCalledWith(302, undefined, { Location: '/room/abc' });
  });

  it('콜백 실패 시 clientUrl 에러 쿼리로 리다이렉트한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    authService.handleCallback.mockRejectedValue(new Error('invalid callback'));
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback('invalid-code', undefined, req, redirect);

    expect(redirectMock).toHaveBeenCalledWith(302, undefined, {
      Location: 'http://localhost:3000?error=auth_failed',
    });
  });

  it('로그아웃 시 refreshToken을 초기화하고 쿠키를 삭제한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest();

    await expect(controller.logout(req)).resolves.toEqual({
      success: true,
      data: { message: 'logged out' },
    });
    expect(authService.logout).toHaveBeenCalledWith('user-id');
    expect(req.res!.clearCookie).toHaveBeenCalledWith('access_token');
    expect(req.res!.clearCookie).toHaveBeenCalledWith('refresh_token', {
      path: '/api/v1/auth/refresh',
    });
  });
});
