import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { YouTubeClient } from './youtube.client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function invalidJsonResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('invalid json')),
  } as unknown as Response;
}

describe('YouTubeClient', () => {
  it('검색 결과를 YouTubeSearchItem 배열로 반환한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: { videoId: 'video-1' },
            snippet: {
              title: '아이유 노래',
              channelTitle: 'IU Official',
              thumbnails: { high: { url: 'https://example.com/high.jpg' } },
            },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.search('아이유', 10)).resolves.toEqual([
      {
        videoId: 'video-1',
        title: '아이유 노래',
        channelTitle: 'IU Official',
        thumbnailUrl: 'https://example.com/high.jpg',
      },
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const url = new URL(fetchFn.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/youtube/v3/search');
    expect(url.searchParams.get('q')).toBe('아이유');
    expect(url.searchParams.get('maxResults')).toBe('10');
    expect(url.searchParams.get('videoCategoryId')).toBe('10');
  });

  it('검색 응답에 videoId가 없는 항목은 제외한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          { id: {}, snippet: { title: 'channel', channelTitle: 'Channel' } },
          {
            id: { videoId: 'video-1' },
            snippet: {
              title: 'video',
              channelTitle: 'Channel',
              thumbnails: { default: { url: 'https://example.com/default.jpg' } },
            },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.search('music')).resolves.toEqual([
      {
        videoId: 'video-1',
        title: 'video',
        channelTitle: 'Channel',
        thumbnailUrl: 'https://example.com/default.jpg',
      },
    ]);
  });

  it('videoIds가 빈 배열이면 영상 상세 API를 호출하지 않는다', async () => {
    const fetchFn = vi.fn<typeof fetch>();
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.getVideoDetails([])).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('영상 상세 응답의 categoryId를 매핑한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'video-1',
            snippet: { categoryId: '10' },
            contentDetails: { duration: 'PT3M' },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.getVideoDetails(['video-1'])).resolves.toEqual([
      {
        videoId: 'video-1',
        title: '',
        channelTitle: '',
        thumbnailUrl: '',
        duration: 180,
        embeddable: true,
        categoryId: '10',
      },
    ]);
  });

  it.each([
    ['PT1H2M3S', 3723],
    ['PT30M', 1800],
    ['PT45S', 45],
    ['PT1H30M', 5400],
    ['PT', 0],
  ])('ISO duration %s를 초 단위 %i로 파싱한다', async (duration, expectedSeconds) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'video-1',
            snippet: {
              title: 'video',
              channelTitle: 'Channel',
              thumbnails: { medium: { url: 'https://example.com/medium.jpg' } },
            },
            contentDetails: { duration },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.getVideoDetails(['video-1'])).resolves.toEqual([
      {
        videoId: 'video-1',
        title: 'video',
        channelTitle: 'Channel',
        thumbnailUrl: 'https://example.com/medium.jpg',
        duration: expectedSeconds,
        embeddable: true,
        categoryId: '',
      },
    ]);

    const url = new URL(fetchFn.mock.calls[0][0] as string);
    expect(url.searchParams.get('part')).toBe('snippet,contentDetails,status');
  });

  it('영상 상세 응답의 embeddable 상태를 매핑한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'video-1',
            snippet: { title: 'video', channelTitle: 'Channel' },
            contentDetails: { duration: 'PT3M' },
            status: { embeddable: false },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.getVideoDetails(['video-1'])).resolves.toEqual([
      {
        videoId: 'video-1',
        title: 'video',
        channelTitle: 'Channel',
        thumbnailUrl: '',
        duration: 180,
        embeddable: false,
        categoryId: '',
      },
    ]);
  });

  it('영상 상세 응답에 status가 없으면 embeddable 기본값 true를 사용한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'video-1',
            snippet: { title: 'video', channelTitle: 'Channel' },
            contentDetails: { duration: 'PT3M' },
          },
        ],
      }),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.getVideoDetails(['video-1'])).resolves.toEqual([
      {
        videoId: 'video-1',
        title: 'video',
        channelTitle: 'Channel',
        thumbnailUrl: '',
        duration: 180,
        embeddable: true,
        categoryId: '',
      },
    ]);
  });

  it('quotaExceeded 403 응답을 SERVER_YOUTUBE_QUOTA_EXCEEDED로 매핑한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 403,
            errors: [{ reason: 'quotaExceeded' }],
          },
        },
        403,
      ),
    );
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.search('music')).rejects.toMatchObject({
      status: 429,
      code: ERROR_CODES.SERVER_YOUTUBE_QUOTA_EXCEEDED,
    });
  });

  it('기타 HTTP 에러를 SERVER_YOUTUBE_API_ERROR로 매핑한다', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(invalidJsonResponse(503));
    const client = new YouTubeClient('api-key', fetchFn);

    await expect(client.search('music')).rejects.toMatchObject({
      status: 502,
      code: ERROR_CODES.SERVER_YOUTUBE_API_ERROR,
    });
  });
});
