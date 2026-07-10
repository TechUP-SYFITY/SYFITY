// 보호 라우트 layout의 인증 경계와 개발용 mock auth 우회를 검증한다.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ toString: () => 'access_token=abc' }),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import ProtectedLayout from './layout';

const ORIGINAL_ENV = { ...process.env };

const res = (status: number, body?: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
  }) as unknown as Response;

const fail = (code: string) => ({ success: false, error: { code, message: code } });

const renderLayout = () => ProtectedLayout({ children: 'PROTECTED' as unknown as ReactNode });

describe('ProtectedLayout auth boundary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    redirectMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders children when /me is 200', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { success: true, data: {} }));

    const result = await renderLayout();

    expect(redirectMock).not.toHaveBeenCalled();
    expect((result as { props: { children: ReactNode } }).props.children).toBe('PROTECTED');
  });

  it('renders children on 401 AUTH_TOKEN_EXPIRED so the client can refresh', async () => {
    fetchMock.mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')));

    await expect(renderLayout()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('blocks 401 AUTH_UNAUTHORIZED', async () => {
    fetchMock.mockResolvedValueOnce(res(401, fail('AUTH_UNAUTHORIZED')));

    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT:/login?reauth=1');
    expect(redirectMock).toHaveBeenCalledWith('/login?reauth=1');
  });

  it('blocks 404 AUTH_USER_NOT_FOUND', async () => {
    fetchMock.mockResolvedValueOnce(res(404, fail('AUTH_USER_NOT_FOUND')));

    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT:/login?reauth=1');
    expect(redirectMock).toHaveBeenCalledWith('/login?reauth=1');
  });

  it('renders children on 5xx transient backend failure', async () => {
    fetchMock.mockResolvedValueOnce(res(503, fail('SERVER_INTERNAL_ERROR')));

    await expect(renderLayout()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('renders children without /me fetch in development mock auth bypass mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = 'enabled';

    const result = await renderLayout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect((result as { props: { children: ReactNode } }).props.children).toBe('PROTECTED');
  });
});
