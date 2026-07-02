import { describe, expect, it } from 'vitest';

import { SEARCH_RESULT_STATUS } from './search';

describe('SEARCH_RESULT_STATUS', () => {
  it('defines all search UI states', () => {
    expect(Object.values(SEARCH_RESULT_STATUS)).toEqual([
      'idle',
      'loading',
      'success',
      'empty',
      'error',
    ]);
  });
});
