import { describe, expect, it, vi } from 'vitest';

import { SearchController } from './search.controller';
import type { SearchResult } from '../types/search';

const items: SearchResult[] = [
  {
    videoId: 'video-1',
    title: 'video',
    channelTitle: 'Channel',
    thumbnailUrl: 'https://example.com/video.jpg',
    duration: 180,
  },
];

function makeSearchService() {
  return {
    search: vi.fn().mockResolvedValue(items),
  };
}

describe('SearchController', () => {
  it('GET /search 응답을 반환한다', async () => {
    const searchService = makeSearchService();
    const controller = new SearchController(searchService);

    await expect(controller.search('BTS')).resolves.toEqual({
      success: true,
      data: { items },
    });
    expect(searchService.search).toHaveBeenCalledWith('BTS');
  });
});
