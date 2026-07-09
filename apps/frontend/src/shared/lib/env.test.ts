import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const importEnv = async () => {
  vi.resetModules();
  return import('./env');
};

const setPublicEnv = (env: {
  NEXT_PUBLIC_API_MOCKING?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_SOCKET_URL?: string;
}) => {
  delete process.env.NEXT_PUBLIC_API_MOCKING;
  delete process.env.NEXT_PUBLIC_API_URL;
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

    const { env, isMockingEnabled } = await importEnv();

    expect(env).toEqual({
      NEXT_PUBLIC_API_MOCKING: 'disabled',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });
    expect(isMockingEnabled()).toBe(false);
  });

  it('accepts enabled API mocking', async () => {
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_API_URL: 'https://api.example.com/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com',
    });

    const { env, isMockingEnabled } = await importEnv();

    expect(env.NEXT_PUBLIC_API_MOCKING).toBe('enabled');
    expect(isMockingEnabled()).toBe(true);
  });

  it('throws when API URL does not end with /api/v1', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPublicEnv({
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });

    await expect(importEnv()).rejects.toThrow('환경변수 형식이 올바르지 않습니다');
  });

  it('throws when API mocking has an unsupported value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setPublicEnv({
      NEXT_PUBLIC_API_MOCKING: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_SOCKET_URL: 'http://localhost:4000',
    });

    await expect(importEnv()).rejects.toThrow('환경변수 형식이 올바르지 않습니다');
  });
});
