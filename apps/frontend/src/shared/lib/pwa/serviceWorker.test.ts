import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadServiceWorker() {
  return import('./serviceWorker');
}

describe('serviceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(navigator, 'standalone');
    Reflect.deleteProperty(navigator, 'userAgent');
  });

  it('MSW가 활성화된 환경에서는 PWA Service Worker를 등록하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'enabled');
    const { isServiceWorkerRegistrationEnabled, registerServiceWorker } = await loadServiceWorker();
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: vi.fn(), register },
    });

    registerServiceWorker(vi.fn());

    expect(isServiceWorkerRegistrationEnabled()).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('프로덕션이 아니면 Service Worker를 등록하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_MOCKING', 'disabled');
    const { isServiceWorkerRegistrationEnabled, registerServiceWorker } = await loadServiceWorker();
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: vi.fn(), register },
    });

    registerServiceWorker(vi.fn());

    expect(isServiceWorkerRegistrationEnabled()).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('standalone display mode과 iOS Safari를 올바르게 판별한다', async () => {
    const { isIOSSafari, isStandaloneDisplayMode } = await loadServiceWorker();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    });

    expect(isStandaloneDisplayMode()).toBe(true);
    expect(isIOSSafari()).toBe(true);
  });

  it('일반 브라우저는 standalone display mode로 판별하지 않는다', async () => {
    const { isStandaloneDisplayMode } = await loadServiceWorker();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });

    expect(isStandaloneDisplayMode()).toBe(false);
  });

  it('iOS Chrome 같은 비 Safari 브라우저에는 설치 안내를 제공하지 않는다', async () => {
    const { isIOSSafari } = await loadServiceWorker();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
    });

    expect(isIOSSafari()).toBe(false);
  });

  it('일반 Chrome 브라우저에는 iOS Safari 안내를 제공하지 않는다', async () => {
    const { isIOSSafari } = await loadServiceWorker();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
    });

    expect(isIOSSafari()).toBe(false);
  });
});
