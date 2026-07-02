import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys, CacheTTL } from '../lib/cache/cacheKeys';
import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import type { SearchResult } from '../types/search';

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

    const searchItems = await this.youtubeClient.search(normalizedQuery, 10);
    const details = await this.youtubeClient.getVideoDetails(
      searchItems.map((item) => item.videoId),
    );
    const detailByVideoId = new Map(details.map((detail) => [detail.videoId, detail]));
    const results = searchItems.flatMap((item) => {
      const detail = detailByVideoId.get(item.videoId);
      return detail ? [detail] : [];
    });

    this.cache.set(cacheKey, results, CacheTTL.YT_SEARCH);
    return results;
  }
}
