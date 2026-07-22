import type {
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
  CreateProfileImageUploadUrlResponse,
  UpdateNicknameResponse,
  UploadProfileImageResponse,
  UserProfileResponse,
} from '@syfity/shared';

import { apiClient, getBaseUrl } from '@/shared/lib/api/apiClient';
import { isMockingEnabled } from '@/shared/lib/env';
import { supabaseStorageClient } from '@/shared/lib/storage/supabaseStorageClient';
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

const completeOnboarding = (body: CompleteOnboardingRequest) =>
  apiClient.patch<CompleteOnboardingResponse['data']>('/me', body);

const updateNickname = (nickname: string) =>
  apiClient.patch<UpdateNicknameResponse['data']>('/me/nickname', { nickname });

const deleteAccount = (): Promise<void> => apiClient.delete('/me');

const uploadProfileImage = async (file: File): Promise<string | null> => {
  if (isMockingEnabled()) return URL.createObjectURL(file);
  if (!supabaseStorageClient) throw new Error('Supabase Storage 환경변수가 설정되지 않았습니다.');
  const { path, token, bucket } = await apiClient.post<CreateProfileImageUploadUrlResponse['data']>(
    '/me/profile-image/upload-url',
    { mimeType: file.type },
  );
  const { error } = await supabaseStorageClient.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file);
  if (error) throw error;
  const data = await apiClient.post<UploadProfileImageResponse['data']>(
    '/me/profile-image/confirm',
    {
      path,
    },
  );
  return data.profileImage;
};

const resetProfileImage = () =>
  apiClient.delete<UploadProfileImageResponse['data']>('/me/profile-image');

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
  completeOnboarding,
  updateNickname,
  deleteAccount,
  uploadProfileImage,
  resetProfileImage,
  loginWithGoogle,
};

export type AuthApi = typeof authApi;
