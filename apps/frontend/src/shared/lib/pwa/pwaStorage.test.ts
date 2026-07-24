import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isInstallPromptInCooldown, recordInstallPromptDismissed } from './pwaStorage';

describe('pwaStorage', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('설치 안내를 닫으면 14일 쿨다운을 저장한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));

    recordInstallPromptDismissed();

    expect(isInstallPromptInCooldown()).toBe(true);
  });

  it('쿨다운이 지나면 설치 안내를 다시 표시할 수 있다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
    recordInstallPromptDismissed();
    vi.advanceTimersByTime(14 * 24 * 60 * 60 * 1000);

    expect(isInstallPromptInCooldown()).toBe(false);
  });
});
