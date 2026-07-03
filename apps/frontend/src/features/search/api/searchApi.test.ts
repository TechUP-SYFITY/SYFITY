import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { searchYoutubeVideos, type SearchApiErrorResponse } from './searchApi';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

describe('searchYoutubeVideos', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000/api/v1';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it('encodes query and calls the YouTube search API', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                videoId: 'abc123',
                title: 'Test Song',
                channelTitle: 'Test Channel',
                thumbnailUrl: 'https://i.ytimg.com/vi/abc123/default.jpg',
                duration: 180,
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const items = await searchYoutubeVideos('lofi playlist');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/v1/search?q=lofi+playlist', {
      credentials: 'include',
    });
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

  it('throws the server error response', async () => {
    const errorResponse: SearchApiErrorResponse = {
      success: false,
      error: {
        code: 'SERVER_YOUTUBE_API_ERROR',
        message: 'YouTube API request failed',
      },
    };

    fetchMock.mockResolvedValue(new Response(JSON.stringify(errorResponse), { status: 502 }));

    await expect(searchYoutubeVideos('error case')).rejects.toEqual(errorResponse);
  });
});
