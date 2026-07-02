import { describe, expect, it } from 'vitest';

import { SEARCH_RESULT_STATUS, type YoutubeSearchResponse } from './search';

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

describe('YoutubeSearchResponse', () => {
  it('matches the backend search response contract', () => {
    const response = {
      success: true,
      data: {
        items: [
          {
            videoId: 'abc123',
            title: '검색 결과',
            channelTitle: 'SYFITY',
            thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
            duration: 120,
          },
        ],
      },
    } satisfies YoutubeSearchResponse;

    expect(response.data.items[0].duration).toBe(120);
  });
});
