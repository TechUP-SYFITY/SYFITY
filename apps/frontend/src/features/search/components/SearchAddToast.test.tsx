import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchAddToast } from './SearchAddToast';

describe('SearchAddToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('announces success once with polite priority and closes manually', async () => {
    const onClose = vi.fn();

    render(
      <SearchAddToast
        feedback={{ id: 1, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={onClose}
      />,
    );

    const visibleToast = (await screen.findByText('플레이리스트에 추가했어요 🎵')).closest(
      '[data-state="open"]',
    );
    const announcer = await screen.findByRole('status');

    expect(visibleToast).not.toHaveAttribute('role');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    await waitFor(() => expect(announcer).toHaveTextContent('알림 플레이리스트에 추가했어요 🎵'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('announces failure once with assertive priority', async () => {
    render(
      <SearchAddToast
        feedback={{ id: 2, variant: 'error', message: '재생할 수 없는 영상이에요.' }}
        onClose={vi.fn()}
      />,
    );

    const visibleToast = (await screen.findByText('재생할 수 없는 영상이에요.')).closest(
      '[data-state="open"]',
    );
    const announcer = await screen.findByRole('status');

    expect(visibleToast).not.toHaveAttribute('role');
    expect(announcer).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('keeps mobile bottom-center and moves desktop feedback to bottom-right', async () => {
    render(
      <SearchAddToast
        feedback={{ id: 3, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={vi.fn()}
      />,
    );

    const region = await screen.findByRole('region', { name: '알림 (F8)' });
    const viewport = region.querySelector('ol');

    expect(viewport).toHaveClass('left-1/2', '-translate-x-1/2');
    expect(viewport).toHaveClass('lg:right-0', 'lg:left-auto', 'lg:translate-x-0', 'lg:p-6');
  });

  it('requests close after four seconds', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();

    render(
      <SearchAddToast
        feedback={{ id: 3, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={onClose}
      />,
    );

    act(() => vi.advanceTimersByTime(4000));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
