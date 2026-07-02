import { describe, expect, it } from 'vitest';

import { MOCK_SEARCH_RESULTS } from './mockSearchResults';

describe('MOCK_SEARCH_RESULTS', () => {
  it('provides five Figma-aligned YouTube search results for stories and demos', () => {
    expect(MOCK_SEARCH_RESULTS).toHaveLength(5);
    expect(MOCK_SEARCH_RESULTS[0]).toMatchObject({
      videoId: 'yKNxeF4KMsY',
      title: 'Yellow',
      channelTitle: 'Coldplay',
      duration: 269,
    });
    expect(MOCK_SEARCH_RESULTS.map((result) => result.title)).toEqual([
      'Yellow',
      'Fix You',
      'Viva La Vida',
      'The Scientist',
      'A Sky Full of Stars',
    ]);
  });
});
