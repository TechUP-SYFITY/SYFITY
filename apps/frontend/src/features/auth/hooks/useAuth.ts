'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { authApi, type AuthApi, type AuthApiError, type UserProfile } from '../api/authApi';

export const authQueryKeys = {
  all: ['auth'] as const,
  me: () => [...authQueryKeys.all, 'me'] as const,
};

export const useMe = (api: AuthApi = authApi): UseQueryResult<UserProfile, AuthApiError> =>
  useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: () => api.getMe(),
    retry: (failureCount, error) =>
      error.status !== undefined && error.status >= 400 && error.status < 500
        ? false
        : failureCount < 1,
  });

export const useLogout = (api: AuthApi = authApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
      window.location.href = '/';
    },
  });
};

function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
}

export const useCompleteOnboarding = (api: AuthApi = authApi) => {
  const invalidateMe = useInvalidateMe();
  return useMutation({ mutationFn: api.completeOnboarding, onSuccess: invalidateMe });
};

export const useUpdateNickname = (api: AuthApi = authApi) => {
  const invalidateMe = useInvalidateMe();
  return useMutation({ mutationFn: api.updateNickname, onSuccess: invalidateMe });
};

export const useDeleteAccount = (api: AuthApi = authApi) =>
  useMutation({ mutationFn: api.deleteAccount });

export const useUploadProfileImage = (api: AuthApi = authApi) => {
  const invalidateMe = useInvalidateMe();
  return useMutation({ mutationFn: api.uploadProfileImage, onSuccess: invalidateMe });
};

export const useResetProfileImage = (api: AuthApi = authApi) => {
  const invalidateMe = useInvalidateMe();
  return useMutation({ mutationFn: api.resetProfileImage, onSuccess: invalidateMe });
};
