import type { UserProfileResponse } from '@syfity/shared';

import { apiClient } from '@/shared/lib/api/apiClient';
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

export const authApi = {
  getMe,
  logout,
};

export type AuthApi = typeof authApi;
