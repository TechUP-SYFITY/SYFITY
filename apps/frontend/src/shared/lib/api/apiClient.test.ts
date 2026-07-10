import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { apiClient, getBaseUrl } from './apiClient';

const res = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const fail = (code: string) => ({ success: false, error: { code, message: code } });
const ok = <T>(data: T) => ({ success: true, data });

const profile = { id: 'u1' };

describe('apiClient request', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns data on success', async () => {
    fetchMock.mockResolvedValueOnce(res(200, ok(profile)));

    await expect(apiClient.get('/me')).resolves.toEqual(profile);
  });

  it('refreshes on 401 AUTH_TOKEN_EXPIRED then retries the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')))
      .mockResolvedValueOnce(res(200, ok({ message: 'token refreshed' })))
      .mockResolvedValueOnce(res(200, ok(profile)));

    await expect(apiClient.get('/me')).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/auth/refresh');
  });

  it('redirects to /login?reauth=1 when the refresh token is expired', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')))
      .mockResolvedValueOnce(res(401, fail('AUTH_REFRESH_EXPIRED')));

    await expect(apiClient.get('/me')).rejects.toHaveProperty('code', 'AUTH_REFRESH_EXPIRED');
    expect(window.location.href).toBe('/login?reauth=1');
  });

  it('does not refresh more than once (no infinite loop)', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')))
      .mockResolvedValueOnce(res(200, ok({ message: 'token refreshed' })))
      .mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')));

    await expect(apiClient.get('/me')).rejects.toBeInstanceOf(ApiClientError);

    const refreshCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    // refresh 후에도 401이면 세션 복구 불가 → 재인증 리다이렉트
    expect(window.location.href).toBe('/login?reauth=1');
  });
});

describe('getBaseUrl', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
  });

  it('falls back to default API URL when env is an empty string', () => {
    process.env.NEXT_PUBLIC_API_URL = '';

    expect(getBaseUrl()).toBe('http://localhost:4000/api/v1');
  });

  it('removes a trailing slash from configured API URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api/v1/';

    expect(getBaseUrl()).toBe('https://api.example.com/api/v1');
  });
});
