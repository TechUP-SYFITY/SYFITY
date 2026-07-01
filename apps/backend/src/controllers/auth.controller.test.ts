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
    getPostLoginRedirectUrl: vi.fn((returnUrl?: string) => returnUrl ?? 'http://localhost:3000'),
    handleCallback: vi.fn().mockResolvedValue({
      user: userRecord,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    } satisfies AuthTokens),
    refresh: vi.fn().mockResolvedValue({
      user: userRecord,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    } satisfies AuthTokens),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRequest(cookies: Record<string, string> = {}): ExRequest {
  return {
    cookies,
    user: { id: 'user-id', email: 'alice@example.com' },
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    },
  } as unknown as ExRequest;
}

describe('AuthController', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
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

    await controller.googleCallback(req, redirect, 'valid-code', '/room/abc');

    expect(authService.handleCallback).toHaveBeenCalledWith('valid-code');
    expect(authService.getPostLoginRedirectUrl).toHaveBeenCalledWith('/room/abc');
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

  it('콜백 성공 시 외부 state는 service fallback redirect를 사용한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    authService.getPostLoginRedirectUrl.mockReturnValue('http://localhost:3000');
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback(req, redirect, 'valid-code', 'https://example.com');

    expect(authService.getPostLoginRedirectUrl).toHaveBeenCalledWith('https://example.com');
    expect(redirectMock).toHaveBeenCalledWith(302, undefined, {
      Location: 'http://localhost:3000',
    });
  });

  it('production 환경에서는 secure strict 쿠키를 설정한다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback(req, redirect, 'valid-code');

    expect(req.res!.cookie).toHaveBeenCalledWith('access_token', 'access-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
  });

  it('콜백 실패 시 clientUrl 에러 쿼리로 리다이렉트한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    authService.handleCallback.mockRejectedValue(new Error('invalid callback'));
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback(req, redirect, 'invalid-code');

    expect(redirectMock).toHaveBeenCalledWith(302, undefined, {
      Location: 'http://localhost:3000?error=auth_failed',
    });
  });

  it('콜백 code가 없으면 Google 처리 없이 clientUrl 에러 쿼리로 리다이렉트한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest();
    const redirectMock = vi.fn();
    const redirect = redirectMock as unknown as TsoaResponse<302, void>;

    await controller.googleCallback(req, redirect);

    expect(authService.handleCallback).not.toHaveBeenCalled();
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

  it('refresh_token 쿠키가 없으면 AUTH_REFRESH_EXPIRED를 반환한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest();

    await expect(controller.refresh(req)).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_REFRESH_EXPIRED',
    });
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('refresh 성공 시 새 쿠키를 설정하고 응답을 반환한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest({ refresh_token: 'old-refresh-token' });

    await expect(controller.refresh(req)).resolves.toEqual({
      success: true,
      data: { message: 'token refreshed' },
    });
    expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token');
    expect(req.res!.cookie).toHaveBeenCalledWith('access_token', 'new-access-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
    expect(req.res!.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh-token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
    });
  });

  it('refresh 성공 시 production 쿠키 옵션을 적용한다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const controller = new AuthController(authService);
    const req = makeRequest({ refresh_token: 'old-refresh-token' });

    await controller.refresh(req);

    expect(req.res!.cookie).toHaveBeenCalledWith('access_token', 'new-access-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    expect(req.res!.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
    });
  });

  it('refresh service 에러를 그대로 전파한다', async () => {
    const { AuthController } = await import('./auth.controller');
    const authService = makeAuthService();
    const error = new Error('refresh failed');
    authService.refresh.mockRejectedValue(error);
    const controller = new AuthController(authService);
    const req = makeRequest({ refresh_token: 'old-refresh-token' });

    await expect(controller.refresh(req)).rejects.toBe(error);
  });
});
