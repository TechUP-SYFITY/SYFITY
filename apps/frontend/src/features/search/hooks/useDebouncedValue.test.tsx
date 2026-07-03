import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('Coldplay', 300));

    expect(result.current).toBe('Coldplay');
  });

  it('updates the value after the debounce delay', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'Coldplay' },
    });

    rerender({ value: 'BTS' });

    expect(result.current).toBe('Coldplay');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('BTS');
  });
});
