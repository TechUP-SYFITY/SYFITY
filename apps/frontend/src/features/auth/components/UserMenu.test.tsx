import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { UserMenu } from './UserMenu';
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

const renderWith = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('UserMenu', () => {
  it('shows a loading skeleton while the profile is pending', () => {
    const api = makeApi({ getMe: vi.fn(() => new Promise<UserProfile>(() => {})) });

    const { container } = renderWith(<UserMenu api={api} />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders the avatar trigger with the nickname initial as fallback', async () => {
    const api = makeApi({ getMe: vi.fn().mockResolvedValue(user) });

    renderWith(<UserMenu api={api} />);

    expect(await screen.findByLabelText('사용자 메뉴')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('redirects to reauth and renders nothing on AUTH_USER_NOT_FOUND', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
    const error = new ApiClientError({ code: 'AUTH_USER_NOT_FOUND', message: 'no user' }, 404);
    const api = makeApi({ getMe: vi.fn().mockRejectedValue(error) });

    const { container } = renderWith(<UserMenu api={api} />);

    await waitFor(() => expect(window.location.href).toBe('/login?reauth=1'));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing (not an endless skeleton) on a transient error', async () => {
    const error = new ApiClientError({ code: 'SERVER_INTERNAL_ERROR', message: 'boom' }, 500);
    const api = makeApi({ getMe: vi.fn().mockRejectedValue(error) });

    const { container } = renderWith(<UserMenu api={api} />);

    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeNull());
    expect(container.firstChild).toBeNull();
  });
});
