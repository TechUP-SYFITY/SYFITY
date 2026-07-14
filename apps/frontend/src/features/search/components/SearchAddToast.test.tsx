import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';

import { SearchAddToast, type SearchAddToastFeedback } from './SearchAddToast';

function renderToast(feedback: SearchAddToastFeedback | null, onClose = vi.fn()) {
  render(
    <ToastProvider>
      <SearchAddToast feedback={feedback} onClose={onClose} />
    </ToastProvider>,
  );

  return onClose;
}

describe('SearchAddToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('pushes a success toast through the shared provider and closes manually', async () => {
    const onClose = renderToast({ id: 1, variant: 'success', message: 'Added to playlist' });

    expect(await screen.findByText('Added to playlist')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pushes an error toast through the shared provider', async () => {
    renderToast({ id: 2, variant: 'error', message: 'Could not add video' });

    expect(await screen.findByText('Could not add video')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveAttribute('aria-live', 'assertive');
  });

  it('does not push a toast without feedback', () => {
    renderToast(null);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('requests close after four seconds', () => {
    vi.useFakeTimers();
    const onClose = renderToast({ id: 3, variant: 'success', message: 'Added to playlist' });

    act(() => vi.advanceTimersByTime(4000));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
