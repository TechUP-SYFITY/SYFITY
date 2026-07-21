import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isIOSSafari,
  isServiceWorkerRegistrationEnabled,
  isStandaloneDisplayMode,
  registerServiceWorker,
} from './serviceWorker';

describe('serviceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    Reflect.deleteProperty(navigator, 'userAgent');
  });

  it('프로덕션이 아니면 Service Worker를 등록하지 않는다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { addEventListener: vi.fn(), register },
    });

    registerServiceWorker(vi.fn());

    expect(isServiceWorkerRegistrationEnabled()).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('standalone display mode과 iOS Safari를 올바르게 판별한다', () => {
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

  it('iOS Chrome 같은 비 Safari 브라우저에는 설치 안내를 제공하지 않는다', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
    });

    expect(isIOSSafari()).toBe(false);
  });
});
