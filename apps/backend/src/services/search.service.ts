import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys, CacheTTL } from '../lib/cache/cacheKeys';
import { YOUTUBE_MUSIC_CATEGORY_ID, type IYouTubeClient } from '../lib/youtube/youtube.client';
import type { SearchResult } from '../types/search';

const SEARCH_FETCH_COUNT = 50;
const SEARCH_RESULT_LIMIT = 10;

export class SearchService {
  constructor(
    private readonly youtubeClient: IYouTubeClient,
    private readonly cache: ICache,
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new AppError(400, ERROR_CODES.SEARCH_QUERY_REQUIRED, '검색어를 입력해주세요.');
    }

    const cacheKey = CacheKeys.ytSearch(normalizedQuery);
    const cachedResults = this.cache.get<SearchResult[]>(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    const searchItems = await this.youtubeClient.search(normalizedQuery, SEARCH_FETCH_COUNT);
    const details = await this.youtubeClient.getVideoDetails(
      searchItems.map((item) => item.videoId),
    );
    const detailByVideoId = new Map(details.map((detail) => [detail.videoId, detail]));
    const results = searchItems
      .flatMap((item): SearchResult[] => {
        const detail = detailByVideoId.get(item.videoId);
        if (detail?.categoryId !== YOUTUBE_MUSIC_CATEGORY_ID) {
          return [];
        }

        return [
          {
            videoId: detail.videoId,
            title: detail.title,
            channelTitle: detail.channelTitle,
            thumbnailUrl: detail.thumbnailUrl,
            duration: detail.duration,
          },
        ];
      })
      .slice(0, SEARCH_RESULT_LIMIT);

    this.cache.set(cacheKey, results, CacheTTL.YT_SEARCH);
    return results;
  }
}
