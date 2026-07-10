// 환경변수 파싱과 개발용 인증 우회 플래그를 검증한다.
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const importEnv = async () => {
  vi.resetModules();
  return import('./env');
};

const setPublicEnv = (env: {
  NEXT_PUBLIC_API_MOCKING?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_DEV_AUTH_BYPASS?: string;
  NEXT_PUBLIC_SOCKET_URL?: string;
}) => {
  delete process.env.NEXT_PUBLIC_API_MOCKING;
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
  delete process.env.NEXT_PUBLIC_SOCKET_URL;
  Object.assign(process.env, env);
};

describe('env', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('falls back to documented local defaults when public env variables are omitted', async () => {
    setPublicEnv({});

    const { env, isDevAuthBypassEnabled, isMockingEnabled } = await importEnv();

    expect(env).toEqual({
      NEXT_PUBLIC_API_MOCKING: 'disabled',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_DEV_AUTH_BYPASS: 'disabled',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });
    expect(isMockingEnabled()).toBe(false);
    expect(isDevAuthBypassEnabled()).toBe(false);
  });

  it('accepts enabled API mocking without enabling dev auth bypass', async () => {
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
    });

    const { env, isDevAuthBypassEnabled, isMockingEnabled } = await importEnv();

    expect(env.NEXT_PUBLIC_API_MOCKING).toBe('enabled');
    expect(isMockingEnabled()).toBe(true);
    expect(isDevAuthBypassEnabled()).toBe(false);
  });

  it('enables dev auth bypass only when development API mocking and bypass are both enabled', async () => {
    process.env.NODE_ENV = 'development';
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_DEV_AUTH_BYPASS: 'enabled',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
    });

    const { isDevAuthBypassEnabled } = await importEnv();

    expect(isDevAuthBypassEnabled()).toBe(true);
  });

  it('keeps dev auth bypass disabled outside development', async () => {
    process.env.NODE_ENV = 'production';
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_DEV_AUTH_BYPASS: 'enabled',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
    });

    const { isDevAuthBypassEnabled } = await importEnv();

    expect(isDevAuthBypassEnabled()).toBe(false);
  });

  it('throws when API URL does not end with /api/v1', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPublicEnv({
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });

    await expect(importEnv()).rejects.toThrow();
  });

  it('throws when API mocking has an unsupported value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });

    await expect(importEnv()).rejects.toThrow();
  });

  it('throws when dev auth bypass has an unsupported value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_DEV_AUTH_BYPASS: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });

    await expect(importEnv()).rejects.toThrow();
  });
});
