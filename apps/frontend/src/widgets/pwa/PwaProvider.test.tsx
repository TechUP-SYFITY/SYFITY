import '@testing-library/jest-dom/vitest';

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BeforeInstallPromptEvent } from '@/shared/lib/pwa/serviceWorker';

import { PwaProvider } from './PwaProvider';
import { usePwaStore } from './pwaStore';

const { registerServiceWorker } = vi.hoisted(() => ({ registerServiceWorker: vi.fn() }));

vi.mock('@/shared/lib/pwa/serviceWorker', () => ({
  isIOSSafari: () => false,
  isStandaloneDisplayMode: () => false,
  registerServiceWorker,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));

describe('PwaProvider', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    usePwaStore.setState({ deferredPrompt: null, isInstalled: false, updateAvailable: false });
  });

  it('beforeinstallprompt를 보관하고 기본 설치 프롬프트를 막는다', () => {
    render(<PwaProvider />);
    const event = new Event('beforeinstallprompt', { cancelable: true });
    const preventDefault = vi.spyOn(event, 'preventDefault');

    act(() => window.dispatchEvent(event));

    expect(preventDefault).toHaveBeenCalled();
    expect(usePwaStore.getState().deferredPrompt).toBe(event);
    expect(registerServiceWorker).toHaveBeenCalledOnce();
  });

  it('appinstalled 후 설치 프롬프트를 지운다', () => {
    usePwaStore.setState({
      deferredPrompt: new Event('beforeinstallprompt') as BeforeInstallPromptEvent,
    });
    render(<PwaProvider />);

    act(() => window.dispatchEvent(new Event('appinstalled')));

    expect(usePwaStore.getState()).toMatchObject({ deferredPrompt: null, isInstalled: true });
  });
});
