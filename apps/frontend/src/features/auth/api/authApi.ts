import type { UserProfileResponse } from '@syfity/shared';

import { apiClient, getBaseUrl } from '@/shared/lib/api/apiClient';
import { isMockingEnabled } from '@/shared/lib/env';
import type { ApiClientError } from '@/shared/types/api';

export type UserProfile = UserProfileResponse['data'];
export type AuthApiError = ApiClientError;

const getMe = async (): Promise<UserProfile> => {
  const data = await apiClient.get<UserProfileResponse['data']>('/me');

  return data;
};

const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

const loginWithGoogle = (returnUrl?: string): void => {
  // 실제 백엔드 /auth/google은 다른 origin이라 MSW(same-origin 서비스워커)가
  // 가로챌 수 없다. mock 모드에서는 실제 OAuth로 나가지 않고 바로 목적지로 이동한다.
  if (isMockingEnabled()) {
    window.location.href = returnUrl ?? '/home';
    return;
  }

  const url = new URL(`${getBaseUrl()}/auth/google`);
  if (returnUrl) {
    url.searchParams.set('returnUrl', returnUrl);
  }
  window.location.href = url.toString();
};

export const authApi = {
  getMe,
  logout,
  loginWithGoogle,
};

export type AuthApi = typeof authApi;
