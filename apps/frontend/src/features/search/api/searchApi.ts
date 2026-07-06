import type { SearchResponse } from '@syfity/shared';

import { apiClient } from '@/shared/lib/api/apiClient';
import type { ApiClientError } from '@/shared/types/api';

export type YoutubeSearchResult = SearchResponse['data']['items'][number];

export type SearchApiError = ApiClientError;

export const searchYoutubeVideos = async (query: string): Promise<YoutubeSearchResult[]> => {
  const params = new URLSearchParams({ q: query });
  const data = await apiClient.get<SearchResponse['data']>(`/search?${params.toString()}`);

  return data.items;
};

export const searchApi = {
  searchVideos: searchYoutubeVideos,
};
