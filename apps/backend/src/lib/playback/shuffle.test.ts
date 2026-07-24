import { describe, expect, it } from 'vitest';

import { buildShuffleQueue } from './shuffle';

describe('buildShuffleQueue', () => {
  it('입력 id를 한 번씩만 포함하는 새 큐를 만든다', () => {
    const input = ['one', 'two', 'three'];
    const queue = buildShuffleQueue(input);
    expect(queue).toHaveLength(input.length);
    expect(new Set(queue)).toEqual(new Set(input));
    expect(queue).not.toBe(input);
  });
});
