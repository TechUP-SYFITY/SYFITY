import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/lib/api/apiClient';
import { isMockingEnabled } from '@/shared/lib/env';
import { ApiClientError } from '@/shared/types/api';

import { authApi } from './authApi';

const { storageFrom, uploadToSignedUrl } = vi.hoisted(() => ({
  storageFrom: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock('@/shared/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getBaseUrl: () => 'http://localhost:4000/api/v1',
}));

vi.mock('@/shared/lib/storage/supabaseStorageClient', () => ({
  supabaseStorageClient: {
    storage: {
      from: storageFrom,
    },
  },
}));

vi.mock('@/shared/lib/env', () => ({
  isMockingEnabled: vi.fn(() => false),
}));

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);
const isMockingEnabledMock = vi.mocked(isMockingEnabled);

const stubLocation = () => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: '' },
  });
};

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isMockingEnabledMock.mockReturnValue(false);
    storageFrom.mockReturnValue({ uploadToSignedUrl });
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

  it('Storage 업로드 오류는 사용자용 한국어 메시지로 변환한다', async () => {
    const file = new File(['image'], 'profile.png', { type: 'image/png' });
    postMock.mockResolvedValueOnce({
      path: 'users/user-1/profile.png',
      token: 'upload-token',
      bucket: 'profile-images',
    });
    uploadToSignedUrl.mockResolvedValueOnce({ error: new Error('The resource already exists') });

    await expect(authApi.uploadProfileImage(file)).rejects.toThrow(
      '이미지 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.',
    );
    expect(storageFrom).toHaveBeenCalledWith('profile-images');
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      'users/user-1/profile.png',
      'upload-token',
      file,
    );
    expect(postMock).toHaveBeenCalledTimes(1);
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

  it('loginWithGoogle이 mock 모드에서는 실제 OAuth 대신 returnUrl로 바로 이동한다', () => {
    stubLocation();
    isMockingEnabledMock.mockReturnValue(true);

    authApi.loginWithGoogle('/room/join?code=ABC123');

    expect(window.location.href).toBe('/room/join?code=ABC123');
  });

  it('loginWithGoogle이 mock 모드이고 returnUrl이 없으면 /home으로 이동한다', () => {
    stubLocation();
    isMockingEnabledMock.mockReturnValue(true);

    authApi.loginWithGoogle();

    expect(window.location.href).toBe('/home');
  });
});
