import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { authQueryKeys, useLogout, useMe } from './useAuth';
import type { AuthApi, UserProfile } from '../api/authApi';

const user: UserProfile = {
  id: 'u1',
  email: 'alice@syfity.com',
  nickname: 'Alice',
  profileImage: null,
};

const makeApi = (over: Partial<AuthApi> = {}): AuthApi =>
  ({
    getMe: vi.fn(),
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    ...over,
  }) as AuthApi;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
};

describe('useMe', () => {
  it('returns the current user profile', async () => {
    const api = makeApi({ getMe: vi.fn().mockResolvedValue(user) });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMe(api), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(user);
  });

  it('surfaces AUTH_USER_NOT_FOUND through error state', async () => {
    const error = new ApiClientError({ code: 'AUTH_USER_NOT_FOUND', message: 'no user' }, 404);
    const api = makeApi({ getMe: vi.fn().mockRejectedValue(error) });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useMe(api), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('AUTH_USER_NOT_FOUND');
  });
});

describe('useLogout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  it('clears auth queries and redirects to landing on success', async () => {
    const api = makeApi({ logout: vi.fn().mockResolvedValue(undefined) });
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(authQueryKeys.me(), user);

    const { result } = renderHook(() => useLogout(api), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(authQueryKeys.me())).toBeUndefined();
    expect(window.location.href).toBe('/');
  });
});
