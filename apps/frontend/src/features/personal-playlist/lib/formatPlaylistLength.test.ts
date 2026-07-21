import { describe, expect, it } from 'vitest';

import { formatPlaylistLength } from './formatPlaylistLength';

describe('formatPlaylistLength', () => {
  it.each([
    [0, '0초'],
    [45, '45초'],
    [59, '59초'],
    [60, '1분'],
    [90, '1분'],
    [3599, '59분'],
    [3600, '1시간'],
    [3660, '1시간 1분'],
    [7380, '2시간 3분'],
  ])('%i초를 "%s"로 표기한다', (seconds, expected) => {
    expect(formatPlaylistLength(seconds)).toBe(expected);
  });

  it('시 단위가 있고 분이 0이면 분을 생략한다', () => {
    expect(formatPlaylistLength(7200)).toBe('2시간');
  });

  it('초 단위 나머지는 분 표기에서 버린다', () => {
    expect(formatPlaylistLength(125)).toBe('2분');
  });

  it('음수는 0초로 처리한다', () => {
    expect(formatPlaylistLength(-10)).toBe('0초');
  });

  it('소수점은 내림한다', () => {
    expect(formatPlaylistLength(59.9)).toBe('59초');
  });
});
