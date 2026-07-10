// Next proxy의 인증 리다이렉트와 개발용 mock auth 우회 조건을 검증한다.
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';

import { proxy } from './proxy';

const ORIGINAL_ENV = { ...process.env };

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
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('redirects authenticated /login access to /home', () => {
    const res = proxy(req('/login', makeToken(future)));

    expect(res?.headers.get('location')).toContain('/home');
  });

  it('clears an invalid session marker without bouncing back to /home', () => {
    const res = proxy(req('/login?reauth=1', makeToken(future)));

    expect(res?.headers.get('location')).toContain('/login');
    expect(res?.headers.get('location')).not.toContain('/home');
    expect(res?.cookies.get('access_token')?.value).toBe('');
  });

  it('allows protected routes with an expired token so the client can refresh', () => {
    const res = proxy(req('/home', makeToken(past)));

    expect(res).toBeUndefined();
  });

  it('redirects authenticated root and login routes to /home', () => {
    expect(proxy(req('/login', makeToken(past)))?.headers.get('location')).toContain('/home');
    expect(proxy(req('/', makeToken(past)))?.headers.get('location')).toContain('/home');
  });

  it('redirects unauthenticated /home access to /login with returnUrl', () => {
    const res = proxy(req('/home'));
    const location = res?.headers.get('location');

    expect(location).toContain('/login');
    expect(location).toContain('returnUrl=%2Fhome');
  });

  it('allows unauthenticated room access only in development mock auth bypass mode', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = 'enabled';

    expect(proxy(req('/room/preview-room'))).toBeUndefined();
  });

  it('keeps unauthenticated room access blocked when dev auth bypass is disabled', () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_API_MOCKING = 'enabled';
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = 'disabled';

    const res = proxy(req('/room/preview-room'));

    expect(res?.headers.get('location')).toContain('/login');
    expect(res?.headers.get('location')).toContain('returnUrl=%2Froom%2Fpreview-room');
  });
});
