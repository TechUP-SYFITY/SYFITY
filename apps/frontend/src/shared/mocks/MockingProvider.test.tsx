import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MockingProvider } from './MockingProvider';

const { isMockingEnabledMock } = vi.hoisted(() => ({
  isMockingEnabledMock: vi.fn(() => true),
}));

vi.mock('@/shared/lib/env', () => ({
  isMockingEnabled: isMockingEnabledMock,
}));

const { startMock } = vi.hoisted(() => ({
  startMock: vi.fn(),
}));

vi.mock('./browser', () => ({
  worker: { start: startMock },
}));

describe('MockingProvider', () => {
  beforeEach(() => {
    isMockingEnabledMock.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('mock이 비활성화면 worker 등록 없이 바로 children을 렌더링한다', () => {
    isMockingEnabledMock.mockReturnValue(false);

    render(
      <MockingProvider>
        <div data-testid="app" />
      </MockingProvider>,
    );

    expect(screen.getByTestId('app')).toBeInTheDocument();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('worker 등록이 성공하면 완료 후 children을 렌더링한다', async () => {
    startMock.mockResolvedValue(undefined);

    render(
      <MockingProvider>
        <div data-testid="app" />
      </MockingProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
  });

  it('worker 등록이 실패해도 화면이 계속 빈 채로 남지 않고 fail-open으로 렌더링한다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    startMock.mockRejectedValue(new Error('service worker registration failed'));

    render(
      <MockingProvider>
        <div data-testid="app" />
      </MockingProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
