import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { SearchService } from './search.service';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys, CacheTTL } from '../lib/cache/cacheKeys';
import type {
  IYouTubeClient,
  YouTubeSearchItem,
  YouTubeVideoDetail,
} from '../lib/youtube/youtube.client';
import type { SearchResult } from '../types/search';

const searchItems: YouTubeSearchItem[] = [
  {
    videoId: 'video-a',
    title: 'A',
    channelTitle: 'Channel A',
    thumbnailUrl: 'https://example.com/a.jpg',
  },
  {
    videoId: 'video-b',
    title: 'B',
    channelTitle: 'Channel B',
    thumbnailUrl: 'https://example.com/b.jpg',
  },
  {
    videoId: 'video-c',
    title: 'C',
    channelTitle: 'Channel C',
    thumbnailUrl: 'https://example.com/c.jpg',
  },
];

const details: YouTubeVideoDetail[] = [
  {
    videoId: 'video-a',
    title: 'A',
    channelTitle: 'Channel A',
    thumbnailUrl: 'https://example.com/a.jpg',
    duration: 10,
    embeddable: true,
    madeForKids: false,
    categoryId: '10',
  },
  {
    videoId: 'video-b',
    title: 'B',
    channelTitle: 'Channel B',
    thumbnailUrl: 'https://example.com/b.jpg',
    duration: 20,
    embeddable: true,
    madeForKids: false,
    categoryId: '10',
  },
  {
    videoId: 'video-c',
    title: 'C',
    channelTitle: 'Channel C',
    thumbnailUrl: 'https://example.com/c.jpg',
    duration: 30,
    embeddable: true,
    madeForKids: false,
    categoryId: '10',
  },
];

const searchResults: SearchResult[] = details.map(
  ({ videoId, title, channelTitle, thumbnailUrl, duration }) => ({
    videoId,
    title,
    channelTitle,
    thumbnailUrl,
    duration,
  }),
);

function makeYouTubeClient(overrides: Partial<IYouTubeClient> = {}): IYouTubeClient {
  return {
    search: vi.fn().mockResolvedValue(searchItems),
    getVideoDetails: vi.fn().mockResolvedValue(details),
    ...overrides,
  };
}

function makeCache(overrides: Partial<ICache> = {}): ICache {
  return {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    del: vi.fn(),
    has: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('SearchService', () => {
  it('캐시 히트 시 YouTube API를 호출하지 않고 캐시 값을 반환한다', async () => {
    const cachedResults: SearchResult[] = [details[0]];
    const youtubeClient = makeYouTubeClient();
    const cache = makeCache({ get: vi.fn().mockReturnValue(cachedResults) });
    const service = new SearchService(youtubeClient, cache);

    await expect(service.search('BTS')).resolves.toBe(cachedResults);
    expect(cache.get).toHaveBeenCalledWith(CacheKeys.ytSearch('BTS'));
    expect(youtubeClient.search).not.toHaveBeenCalled();
    expect(youtubeClient.getVideoDetails).not.toHaveBeenCalled();
  });

  it('캐시 미스 시 YouTube 검색과 영상 상세를 병합하고 캐시에 저장한다', async () => {
    const youtubeClient = makeYouTubeClient();
    const cache = makeCache();
    const service = new SearchService(youtubeClient, cache);

    await expect(service.search('BTS')).resolves.toEqual(searchResults);
    expect(youtubeClient.search).toHaveBeenCalledWith('BTS', 50);
    expect(youtubeClient.getVideoDetails).toHaveBeenCalledWith(['video-a', 'video-b', 'video-c']);
    expect(cache.set).toHaveBeenCalledWith(
      CacheKeys.ytSearch('BTS'),
      searchResults,
      CacheTTL.YT_SEARCH,
    );
  });

  it('빈 문자열 query는 SEARCH_QUERY_REQUIRED를 반환한다', async () => {
    const service = new SearchService(makeYouTubeClient(), makeCache());

    await expect(service.search('')).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
    });
  });

  it('공백만 있는 query는 SEARCH_QUERY_REQUIRED를 반환한다', async () => {
    const service = new SearchService(makeYouTubeClient(), makeCache());

    await expect(service.search('   ')).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.SEARCH_QUERY_REQUIRED,
    });
  });

  it('영상 상세에 없는 항목은 제외한다', async () => {
    const youtubeClient = makeYouTubeClient({
      getVideoDetails: vi.fn().mockResolvedValue(details.slice(0, 2)),
    });
    const service = new SearchService(youtubeClient, makeCache());

    await expect(service.search('BTS')).resolves.toEqual(searchResults.slice(0, 2));
  });

  it('Music 카테고리 영상만 검색 결과에 포함한다', async () => {
    const youtubeClient = makeYouTubeClient({
      getVideoDetails: vi
        .fn()
        .mockResolvedValue([
          details[0],
          { ...details[1], categoryId: '20' },
          { ...details[2], categoryId: '' },
        ]),
    });
    const service = new SearchService(youtubeClient, makeCache());

    await expect(service.search('BTS')).resolves.toEqual([searchResults[0]]);
  });

  it('Music 결과가 10개를 초과하면 상위 10개만 반환하고 캐시한다', async () => {
    const manySearchItems = Array.from({ length: 12 }, (_, index) => ({
      videoId: `video-${index + 1}`,
      title: `Song ${index + 1}`,
      channelTitle: 'Channel',
      thumbnailUrl: `https://example.com/${index + 1}.jpg`,
    }));
    const manyDetails = manySearchItems.map((item, index) => ({
      ...item,
      duration: index + 1,
      embeddable: true,
      categoryId: '10',
    }));
    const youtubeClient = makeYouTubeClient({
      search: vi.fn().mockResolvedValue(manySearchItems),
      getVideoDetails: vi.fn().mockResolvedValue(manyDetails),
    });
    const cache = makeCache();
    const service = new SearchService(youtubeClient, cache);

    const results = await service.search('BTS');

    expect(results).toHaveLength(10);
    expect(results.map((result) => result.videoId)).toEqual(
      manySearchItems.slice(0, 10).map((item) => item.videoId),
    );
    expect(cache.set).toHaveBeenCalledWith(CacheKeys.ytSearch('BTS'), results, CacheTTL.YT_SEARCH);
  });

  it('필터링 뒤 Music 결과가 10개 미만이면 있는 결과만 반환한다', async () => {
    const youtubeClient = makeYouTubeClient({
      getVideoDetails: vi.fn().mockResolvedValue([details[0]]),
    });
    const service = new SearchService(youtubeClient, makeCache());

    await expect(service.search('BTS')).resolves.toEqual([searchResults[0]]);
    expect(youtubeClient.search).toHaveBeenCalledTimes(1);
  });

  it('YouTube API 오류는 그대로 전파한다', async () => {
    const error = new Error('youtube failed');
    const youtubeClient = makeYouTubeClient({
      search: vi.fn().mockRejectedValue(error),
    });
    const service = new SearchService(youtubeClient, makeCache());

    await expect(service.search('BTS')).rejects.toBe(error);
  });

  it('영상 상세 응답 순서와 관계없이 검색 결과 순서를 보존한다', async () => {
    const youtubeClient = makeYouTubeClient({
      getVideoDetails: vi.fn().mockResolvedValue([details[2], details[1], details[0]]),
    });
    const service = new SearchService(youtubeClient, makeCache());

    await expect(service.search('BTS')).resolves.toEqual([
      searchResults[0],
      searchResults[1],
      searchResults[2],
    ]);
  });

  it('query trim을 적용해 캐시 키와 YouTube 검색어를 만든다', async () => {
    const youtubeClient = makeYouTubeClient();
    const cache = makeCache();
    const service = new SearchService(youtubeClient, cache);

    await service.search(' BTS ');

    expect(cache.get).toHaveBeenCalledWith(CacheKeys.ytSearch('BTS'));
    expect(youtubeClient.search).toHaveBeenCalledWith('BTS', 50);
  });
});
