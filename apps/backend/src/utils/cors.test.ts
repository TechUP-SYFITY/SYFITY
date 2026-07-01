import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('isAllowedOrigin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('ALLOWED_ORIGINS', 'http://localhost:3000,https://app.example.com');
  });

  it('환경변수에 등록된 origin을 허용한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://app.example.com')).toBe(true);
  });

  it('Vercel preview origin을 허용한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('https://syfity-git-main-team.vercel.app')).toBe(true);
  });

  it('등록되지 않은 origin은 거부한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('https://example.net')).toBe(false);
  });
});
