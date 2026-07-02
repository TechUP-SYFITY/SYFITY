import { describe, expect, it } from 'vitest';

import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats seconds as m:ss for short videos', () => {
    expect(formatDuration(273)).toBe('4:33');
  });

  it('formats seconds as h:mm:ss for long videos', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('clamps invalid negative durations to zero', () => {
    expect(formatDuration(-1)).toBe('0:00');
  });
});
