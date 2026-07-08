import type { UserProfileResponse } from '@syfity/shared';

import { apiClient, getBaseUrl } from '@/shared/lib/api/apiClient';
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
