import { describe, expect, it, vi } from 'vitest';

describe('config', () => {
  it('uses the local Google OAuth callback URL when GOOGLE_CALLBACK_URL is not set', async () => {
    vi.resetModules();
    vi.stubEnv('PORT', '');
    vi.stubEnv('GOOGLE_CALLBACK_URL', '');

    const { config } = await import('./config');

    expect(config.google.callbackUrl).toBe('http://localhost:4000/api/v1/auth/google/callback');
  });
});
