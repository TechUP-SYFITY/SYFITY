import { afterEach, describe, expect, it } from 'vitest';

import type { BeforeInstallPromptEvent } from '@/shared/lib/pwa/serviceWorker';

import { usePwaStore } from './pwaStore';

const initialState = {
  deferredPrompt: null,
  isInstalled: false,
  updateAvailable: false,
};

describe('usePwaStore', () => {
  afterEach(() => {
    usePwaStore.setState(initialState);
  });

  it('설치와 업데이트 상태를 갱신한다', () => {
    const deferredPrompt = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;

    usePwaStore.getState().setDeferredPrompt(deferredPrompt);
    usePwaStore.getState().setInstalled(true);
    usePwaStore.getState().setUpdateAvailable(true);

    expect(usePwaStore.getState()).toMatchObject({
      deferredPrompt,
      isInstalled: true,
      updateAvailable: true,
    });
  });
});
