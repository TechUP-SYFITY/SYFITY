import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchAddToast } from './SearchAddToast';

describe('SearchAddToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders success feedback with the shared success Toast and closes manually', () => {
    const onClose = vi.fn();

    render(
      <SearchAddToast
        feedback={{ id: 1, variant: 'success', message: '플레이리스트에 추가했어요 🎵' }}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByText('플레이리스트에 추가했어요 🎵').closest('[role="status"]'),
    ).toHaveTextContent('플레이리스트에 추가했어요 🎵');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders failure feedback as an alert', () => {
    render(
      <SearchAddToast
        feedback={{ id: 2, variant: 'error', message: '재생할 수 없는 영상이에요.' }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('재생할 수 없는 영상이에요.');
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
