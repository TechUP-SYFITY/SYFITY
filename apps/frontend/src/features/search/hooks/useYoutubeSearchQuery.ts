'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { searchApi, type SearchApiError, type YoutubeSearchResult } from '../api/searchApi';

export const youtubeSearchQueryKeys = {
  all: ['youtube-search'] as const,
  search: (query: string) => [...youtubeSearchQueryKeys.all, query] as const,
};

export const useYoutubeSearchQuery = (
  query: string,
): UseQueryResult<YoutubeSearchResult[], SearchApiError> => {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: youtubeSearchQueryKeys.search(normalizedQuery),
    queryFn: () => searchApi.searchVideos(normalizedQuery),
    enabled: normalizedQuery.length > 0,
  });
};
