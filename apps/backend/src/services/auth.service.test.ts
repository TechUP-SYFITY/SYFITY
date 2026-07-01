import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAuthRepository, UserRecord } from '../types/auth';

const ACCESS_SECRET = 'test-access-secret';
const REFRESH_SECRET = 'test-refresh-secret';
const GOOGLE_CLIENT_ID = 'google-client-id';

const userRecord: UserRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  refreshToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

type GooglePayload = {
  email?: string;
  name?: string;
  picture?: string;
};

function makeRepo(): IAuthRepository {
  return {
    upsertUser: vi.fn().mockResolvedValue(userRecord),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    clearRefreshToken: vi.fn().mockResolvedValue(undefined),
  };
}

function makeOauthClient(payload: GooglePayload = {}) {
  return {
    generateAuthUrl: vi.fn(
      ({ state }) => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
    ),
    getToken: vi.fn().mockResolvedValue({ tokens: { id_token: 'google-id-token' } }),
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'alice@example.com',
        name: 'Alice',
        picture: 'https://example.com/alice.png',
        ...payload,
      }),
    }),
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('JWT_ACCESS_SECRET', ACCESS_SECRET);
    vi.stubEnv('JWT_REFRESH_SECRET', REFRESH_SECRET);
    vi.stubEnv('GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID);
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/v1/auth/google/callback');
  });

  it('returnUrl을 OAuth state에 담은 Google 인증 URL을 생성한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    const service = new AuthService(repo, oauthClient);

    const url = service.getAuthorizationUrl('/room/abc');

    expect(url).toContain('accounts.google.com');
    expect(oauthClient.generateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: '/room/abc',
    });
  });

  it('외부 returnUrl은 OAuth state에 담지 않는다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    const service = new AuthService(repo, oauthClient);

    service.getAuthorizationUrl('https://example.com');
    service.getAuthorizationUrl('//example.com');

    expect(oauthClient.generateAuthUrl).toHaveBeenNthCalledWith(1, {
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: '',
    });
    expect(oauthClient.generateAuthUrl).toHaveBeenNthCalledWith(2, {
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state: '',
    });
  });

  it('로그인 후 redirect URL은 내부 상대 경로만 허용한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    const service = new AuthService(repo, oauthClient);

    expect(service.getPostLoginRedirectUrl('/room/abc')).toBe('/room/abc');
    expect(service.getPostLoginRedirectUrl('https://example.com')).toBe('http://localhost:3000');
    expect(service.getPostLoginRedirectUrl('//example.com')).toBe('http://localhost:3000');
  });

  it('정상 콜백에서 사용자를 upsert하고 access/refresh token을 발급한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    const service = new AuthService(repo, oauthClient);

    const result = await service.handleCallback('valid-code');

    expect(oauthClient.getToken).toHaveBeenCalledWith('valid-code');
    expect(oauthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-id-token',
      audience: GOOGLE_CLIENT_ID,
    });
    expect(repo.upsertUser).toHaveBeenCalledWith({
      email: 'alice@example.com',
      nickname: 'Alice',
      profileImage: 'https://example.com/alice.png',
    });
    expect(jwt.verify(result.accessToken, ACCESS_SECRET)).toMatchObject({
      id: 'user-id',
      email: 'alice@example.com',
    });
    expect(jwt.verify(result.refreshToken, REFRESH_SECRET)).toMatchObject({ id: 'user-id' });
    expect(repo.saveRefreshToken).toHaveBeenCalledWith('user-id', result.refreshToken);
  });

  it('id_token이 없으면 AUTH_GOOGLE_TOKEN_MISSING을 반환한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    oauthClient.getToken.mockResolvedValue({ tokens: {} });
    const service = new AuthService(repo, oauthClient);

    await expect(service.handleCallback('valid-code')).rejects.toMatchObject({
      status: 400,
      code: 'AUTH_GOOGLE_TOKEN_MISSING',
    });
  });

  it('Google API 오류를 AUTH_GOOGLE_CALLBACK_FAILED로 변환한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    oauthClient.getToken.mockRejectedValue(new Error('invalid code'));
    const service = new AuthService(repo, oauthClient);

    await expect(service.handleCallback('invalid-code')).rejects.toMatchObject({
      status: 400,
      code: 'AUTH_GOOGLE_CALLBACK_FAILED',
    });
  });

  it('ID 토큰 검증 실패를 AUTH_GOOGLE_TOKEN_INVALID로 변환한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    oauthClient.verifyIdToken.mockRejectedValue(new Error('invalid token'));
    const service = new AuthService(repo, oauthClient);

    await expect(service.handleCallback('valid-code')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_GOOGLE_TOKEN_INVALID',
    });
  });

  it('payload에 email이 없으면 AUTH_GOOGLE_EMAIL_MISSING을 반환한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient({ email: undefined });
    const service = new AuthService(repo, oauthClient);

    await expect(service.handleCallback('valid-code')).rejects.toMatchObject({
      status: 400,
      code: 'AUTH_GOOGLE_EMAIL_MISSING',
    });
  });

  it('로그아웃 시 refreshToken을 초기화한다', async () => {
    const { AuthService } = await import('./auth.service');
    const repo = makeRepo();
    const oauthClient = makeOauthClient();
    const service = new AuthService(repo, oauthClient);

    await service.logout('user-id');

    expect(repo.clearRefreshToken).toHaveBeenCalledWith('user-id');
  });
});
