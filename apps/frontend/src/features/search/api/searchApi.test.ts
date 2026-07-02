import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchApi } from './searchApi';

const fetchMock = vi.fn<typeof fetch>();

describe('searchApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('requests the backend search endpoint with credentials and returns videos', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                videoId: 'abc123',
                title: '테스트 영상',
                channelTitle: 'SYFITY',
                thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
                duration: 245,
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchApi.searchVideos('new jeans')).resolves.toEqual([
      {
        videoId: 'abc123',
        title: '테스트 영상',
        channelTitle: 'SYFITY',
        thumbnailUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
        duration: 245,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/search?q=new+jeans',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});
