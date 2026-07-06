import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/lib/api/apiClient';
import { ApiClientError } from '@/shared/types/api';

import { searchApi } from './searchApi';

vi.mock('@/shared/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const getMock = vi.mocked(apiClient.get);

describe('searchApi.searchVideos', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('encodes query and calls the YouTube search API', async () => {
    getMock.mockResolvedValue({
      items: [
        {
          videoId: 'abc123',
          title: 'Test Song',
          channelTitle: 'Test Channel',
          thumbnailUrl: 'https://i.ytimg.com/vi/abc123/default.jpg',
          duration: 180,
        },
      ],
    });

    const items = await searchApi.searchVideos('lofi playlist');

    expect(getMock).toHaveBeenCalledWith('/search?q=lofi+playlist');
    expect(items).toEqual([
      {
        videoId: 'abc123',
        title: 'Test Song',
        channelTitle: 'Test Channel',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/default.jpg',
        duration: 180,
      },
    ]);
  });

  it('throws the API client error', async () => {
    const error = new ApiClientError(
      {
        code: 'SERVER_YOUTUBE_API_ERROR',
        message: 'YouTube API request failed',
      },
      502,
    );

    getMock.mockRejectedValue(error);

    await expect(searchApi.searchVideos('error case')).rejects.toEqual(error);
  });
});
