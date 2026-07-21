import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { routerBack, routerReplace } = vi.hoisted(() => ({
  routerBack: vi.fn(),
  routerReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: routerBack, replace: routerReplace }),
}));

import OfflinePage from './page';

describe('OfflinePage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('이전 경로가 있으면 온라인 복귀 시 뒤로 이동한다', () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 2 });
    render(<OfflinePage />);

    act(() => window.dispatchEvent(new Event('online')));

    expect(routerBack).toHaveBeenCalledOnce();
    expect(screen.getByText('인터넷 연결이 필요해요')).toBeInTheDocument();
  });

  it('이전 경로가 없으면 Home으로 이동한다', () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
    render(<OfflinePage />);

    act(() => window.dispatchEvent(new Event('online')));

    expect(routerReplace).toHaveBeenCalledWith('/home');
  });
});
