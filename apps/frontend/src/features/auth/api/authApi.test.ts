import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/lib/api/apiClient';
import { ApiClientError } from '@/shared/types/api';

import { authApi } from './authApi';

vi.mock('@/shared/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getBaseUrl: () => 'http://localhost:4000/api/v1',
}));

const getMock = vi.mocked(apiClient.get);

const stubLocation = () => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
};

describe('authApi', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getMe requests /me and returns profile data', async () => {
    const profile = { id: 'u1', email: 'a@b.com', nickname: 'Nick', profileImage: null };
    getMock.mockResolvedValue(profile);

    await expect(authApi.getMe()).resolves.toEqual(profile);
    expect(getMock).toHaveBeenCalledWith('/me');
  });

  it('getMe propagates the API client error', async () => {
    const error = new ApiClientError({ code: 'AUTH_USER_NOT_FOUND', message: 'no user' }, 404);
    getMock.mockRejectedValue(error);

    await expect(authApi.getMe()).rejects.toBe(error);
  });

  it('loginWithGoogle builds the auth URL with returnUrl', () => {
    stubLocation();

    authApi.loginWithGoogle('/home');

    expect(window.location.href).toBe('http://localhost:4000/api/v1/auth/google?returnUrl=%2Fhome');
  });

  it('loginWithGoogle omits returnUrl when not provided', () => {
    stubLocation();

    authApi.loginWithGoogle();

    expect(window.location.href).toBe('http://localhost:4000/api/v1/auth/google');
  });
});
