import { describe, expect, it } from 'vitest';

import { MOCK_SEARCH_RESULTS } from './mockSearchResults';

describe('MOCK_SEARCH_RESULTS', () => {
  it('provides five YouTube search results for stories', () => {
    expect(MOCK_SEARCH_RESULTS).toHaveLength(5);
    expect(MOCK_SEARCH_RESULTS[0]).toMatchObject({
      title: 'Yellow',
      channelTitle: 'Coldplay',
      duration: '4:33',
    });
  });
});
