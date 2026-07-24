import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isMockingEnabled } from '@/shared/lib/env';

import { proxy } from './proxy';

vi.mock('@/shared/lib/env', () => ({
  isMockingEnabled: vi.fn(() => false),
}));

const isMockingEnabledMock = vi.mocked(isMockingEnabled);

// exp(초) 기준으로 서명 없이 payload만 있는 더미 JWT를 만든다(proxy는 서명 검증 안 함).
const makeToken = (expSeconds: number) => {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `header.${payload}.sig`;
};

const req = (path: string, token?: string) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: token ? { cookie: `access_token=${token}` } : {},
  });

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

describe('proxy', () => {
  beforeEach(() => {
    isMockingEnabledMock.mockReturnValue(false);
  });

  it('mock 모드에서는 토큰 유무와 무관하게 그대로 통과시킨다', () => {
    isMockingEnabledMock.mockReturnValue(true);

    expect(proxy(req('/home'))).toBeUndefined();
    expect(proxy(req('/room/abc'))).toBeUndefined();
  });

  it('유효 토큰으로 /login 접근 시 /home으로 바운스', () => {
    const res = proxy(req('/login', makeToken(future)));
    expect(res?.headers.get('location')).toContain('/home');
  });

  it('layout이 넘긴 ?reauth=1은 /home으로 바운스하지 않고 쿠키를 지운 뒤 /login 렌더(무한 루프 방지)', () => {
    const res = proxy(req('/login?reauth=1', makeToken(future)));
    expect(res?.headers.get('location')).toContain('/login');
    expect(res?.headers.get('location')).not.toContain('/home');
    expect(res?.cookies.get('access_token')?.value).toBe(''); // delete → 빈 값
  });

  it('만료 토큰은 로그아웃/삭제 없이 통과시켜 클라 refresh에 맡긴다', () => {
    // 백엔드 의도(자동로그인): 만료돼도 쿠키를 지우지 않고, 클라 apiClient가 refresh로 재발급한다.
    const res = proxy(req('/home', makeToken(past)));
    expect(res).toBeUndefined();
  });

  it('토큰이 있으면 만료 여부와 무관하게 진입 페이지에서 /home으로 바운스', () => {
    // 존재 기반: 만료돼도 로그인 유저로 보고 /home으로 보낸 뒤 클라 refresh가 복구한다.
    expect(proxy(req('/login', makeToken(past)))?.headers.get('location')).toContain('/home');
    expect(proxy(req('/', makeToken(past)))?.headers.get('location')).toContain('/home');
  });

  it('비로그인 /home 접근은 returnUrl 붙여 /login', () => {
    const res = proxy(req('/home'));
    const location = res?.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('returnUrl=%2Fhome');
  });

  it.each(['/onboarding', '/settings', '/playlists', '/playlists/personal-1'])(
    '비로그인 보호 경로 %s 접근은 returnUrl과 함께 /login으로 보낸다',
    (path) => {
      const location = proxy(req(path))?.headers.get('location');

      expect(location).toContain('/login');
      expect(location).toContain(`returnUrl=${encodeURIComponent(path)}`);
    },
  );
});
