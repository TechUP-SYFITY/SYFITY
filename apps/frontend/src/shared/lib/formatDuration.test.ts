import { describe, expect, it } from 'vitest';

import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59, '0:59'],
    [60, '1:00'],
    [269, '4:29'],
  ])('%i초를 %s로 표시한다', (duration, formattedDuration) => {
    expect(formatDuration(duration)).toBe(formattedDuration);
  });
});
