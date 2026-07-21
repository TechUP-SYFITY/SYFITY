import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePwaStore } from './pwaStore';
import { PwaUpdateNotice } from './PwaUpdateNotice';

const { applyServiceWorkerUpdate } = vi.hoisted(() => ({ applyServiceWorkerUpdate: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: () => '/home' }));

vi.mock('@/shared/lib/pwa/serviceWorker', () => ({ applyServiceWorkerUpdate }));

describe('PwaUpdateNotice', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    usePwaStore.setState({ deferredPrompt: null, isInstalled: false, updateAvailable: false });
  });

  it('업데이트가 가능할 때 새로고침으로 적용을 요청한다', () => {
    usePwaStore.setState({ updateAvailable: true });
    render(<PwaUpdateNotice />);

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(applyServiceWorkerUpdate).toHaveBeenCalledOnce();
  });

  it('업데이트가 없으면 렌더링하지 않는다', () => {
    render(<PwaUpdateNotice />);

    expect(screen.queryByLabelText('새 버전 안내')).not.toBeInTheDocument();
  });
});
