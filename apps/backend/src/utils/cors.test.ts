import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('isAllowedOrigin', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('../lib/logger');
    vi.resetModules();
    vi.stubEnv('ALLOWED_ORIGINS', 'http://localhost:3000,https://app.example.com');
  });

  it('환경변수에 등록된 origin을 허용한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://app.example.com')).toBe(true);
  });

  it('ALLOWED_ORIGINS에 없는 Vercel preview origin은 거부한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('https://syfity-git-main-team.vercel.app')).toBe(false);
  });

  it('등록되지 않은 origin은 거부한다', async () => {
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('https://example.net')).toBe(false);
  });

  it('프로젝트와 팀으로 제한한 Vercel preview origin 패턴을 허용한다', async () => {
    vi.stubEnv(
      'VERCEL_PREVIEW_ORIGIN_PATTERN',
      '^https://syfity-frontend-[a-z0-9-]+-techup-syfity\\.vercel\\.app$',
    );
    const { isAllowedOrigin } = await import('./cors');

    expect(isAllowedOrigin('https://syfity-frontend-git-feat-foo-techup-syfity.vercel.app')).toBe(
      true,
    );
    expect(isAllowedOrigin('https://other-project-git-main-techup-syfity.vercel.app')).toBe(false);
  });

  it('전체 origin 앵커가 없는 preview origin 정규식은 경고 후 거부한다', async () => {
    const warn = vi.fn();
    vi.stubEnv('VERCEL_PREVIEW_ORIGIN_PATTERN', 'syfity-frontend-[a-z0-9-]+-techup-syfity');
    vi.doMock('../lib/logger', () => ({ logger: { warn } }));
    const { isAllowedOrigin } = await import('./cors');

    expect(warn).toHaveBeenCalledOnce();
    expect(isAllowedOrigin('https://syfity-frontend-git-main-techup-syfity.vercel.app')).toBe(
      false,
    );
  });

  it('잘못된 preview origin 정규식은 경고 후 정확 일치 목록으로 폴백한다', async () => {
    const warn = vi.fn();
    vi.stubEnv('VERCEL_PREVIEW_ORIGIN_PATTERN', '^[$');
    vi.doMock('../lib/logger', () => ({ logger: { warn } }));
    const { isAllowedOrigin } = await import('./cors');

    expect(warn).toHaveBeenCalledWith(
      { err: expect.any(SyntaxError) },
      'VERCEL_PREVIEW_ORIGIN_PATTERN이 올바른 정규식이 아닙니다. Preview origin 허용을 비활성화합니다.',
    );
    expect(isAllowedOrigin('https://app.example.com')).toBe(true);
    expect(isAllowedOrigin('https://syfity-frontend-git-main-techup-syfity.vercel.app')).toBe(
      false,
    );
  });
});
