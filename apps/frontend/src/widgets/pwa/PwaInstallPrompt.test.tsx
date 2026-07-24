import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isInstallPromptInCooldown } from '@/shared/lib/pwa/pwaStorage';
import type { BeforeInstallPromptEvent } from '@/shared/lib/pwa/serviceWorker';

import { PwaInstallPrompt } from './PwaInstallPrompt';
import { usePwaStore } from './pwaStore';

const { isIOSSafari, isStandaloneDisplayMode, pathname } = vi.hoisted(() => ({
  isIOSSafari: vi.fn(),
  isStandaloneDisplayMode: vi.fn(),
  pathname: { value: '/home' },
}));

vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

vi.mock('@/shared/lib/pwa/serviceWorker', () => ({
  isIOSSafari,
  isStandaloneDisplayMode,
}));

function createDeferredPrompt() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
  return { event, prompt };
}

describe('PwaInstallPrompt', () => {
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
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    pathname.value = '/home';
    isIOSSafari.mockReturnValue(false);
    isStandaloneDisplayMode.mockReturnValue(false);
    usePwaStore.setState({ deferredPrompt: null, isInstalled: false, updateAvailable: false });
  });

  it('Room 화면에는 설치 안내를 표시하지 않는다', () => {
    pathname.value = '/room/abc';
    usePwaStore.setState({ deferredPrompt: createDeferredPrompt().event });

    render(<PwaInstallPrompt />);

    expect(screen.queryByLabelText('Syfity 설치 안내')).not.toBeInTheDocument();
  });

  it('standalone 모드에서는 설치 안내를 표시하지 않는다', () => {
    isStandaloneDisplayMode.mockReturnValue(true);
    usePwaStore.setState({ deferredPrompt: createDeferredPrompt().event });

    render(<PwaInstallPrompt />);

    expect(screen.queryByLabelText('Syfity 설치 안내')).not.toBeInTheDocument();
  });

  it('app Header보다 위에 설치 안내를 표시한다', () => {
    usePwaStore.setState({ deferredPrompt: createDeferredPrompt().event });

    render(<PwaInstallPrompt />);

    expect(screen.getByLabelText('Syfity 설치 안내')).toHaveClass('z-50');
  });

  it('설치 가능하면 네이티브 설치 프롬프트를 연다', async () => {
    const { event, prompt } = createDeferredPrompt();
    usePwaStore.setState({ deferredPrompt: event });

    render(<PwaInstallPrompt />);
    fireEvent.click(screen.getByRole('button', { name: '설치' }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(usePwaStore.getState().deferredPrompt).toBeNull());
  });

  it('설치 프롬프트가 거부돼도 배너 상태를 정리한다', async () => {
    const { event, prompt } = createDeferredPrompt();
    Object.assign(event, {
      userChoice: Promise.reject(new Error('설치 프롬프트가 이미 소비되었습니다.')),
    });
    usePwaStore.setState({ deferredPrompt: event });

    render(<PwaInstallPrompt />);
    fireEvent.click(screen.getByRole('button', { name: '설치' }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(usePwaStore.getState().deferredPrompt).toBeNull());
  });

  it('iOS Safari에는 홈 화면 추가 절차를 안내한다', () => {
    isIOSSafari.mockReturnValue(true);

    render(<PwaInstallPrompt />);

    expect(screen.getByText(/홈 화면에 추가/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '설치' })).not.toBeInTheDocument();
  });

  it('닫기를 누르면 쿨다운을 기록하고 배너를 숨긴다', () => {
    usePwaStore.setState({ deferredPrompt: createDeferredPrompt().event });

    render(<PwaInstallPrompt />);
    fireEvent.click(screen.getByRole('button', { name: '설치 안내 닫기' }));

    expect(isInstallPromptInCooldown()).toBe(true);
    expect(screen.queryByLabelText('Syfity 설치 안내')).not.toBeInTheDocument();
  });
});
