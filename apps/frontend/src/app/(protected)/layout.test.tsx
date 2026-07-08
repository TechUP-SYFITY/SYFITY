import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// redirect는 vi.mock 팩토리에서 참조하므로 hoisted로 만든다.
const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    // 실제 next redirect는 실행을 중단시키므로 throw로 흉내낸다.
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
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders children when /me is 200', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { success: true, data: {} }));

    const result = await renderLayout();

    expect(redirectMock).not.toHaveBeenCalled();
    expect((result as { props: { children: ReactNode } }).props.children).toBe('PROTECTED');
  });

  it('renders children on 401 AUTH_TOKEN_EXPIRED (정상 만료 → 클라 refresh)', async () => {
    fetchMock.mockResolvedValueOnce(res(401, fail('AUTH_TOKEN_EXPIRED')));

    await expect(renderLayout()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('blocks 401 AUTH_UNAUTHORIZED (위조·무효 토큰)', async () => {
    fetchMock.mockResolvedValueOnce(res(401, fail('AUTH_UNAUTHORIZED')));

    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT:/login?reauth=1');
    expect(redirectMock).toHaveBeenCalledWith('/login?reauth=1');
  });

  it('blocks 404 AUTH_USER_NOT_FOUND (유저 없음)', async () => {
    fetchMock.mockResolvedValueOnce(res(404, fail('AUTH_USER_NOT_FOUND')));

    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT:/login?reauth=1');
    expect(redirectMock).toHaveBeenCalledWith('/login?reauth=1');
  });

  it('renders children on 5xx (일시 장애 → 통과)', async () => {
    fetchMock.mockResolvedValueOnce(res(503, fail('SERVER_INTERNAL_ERROR')));

    await expect(renderLayout()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
