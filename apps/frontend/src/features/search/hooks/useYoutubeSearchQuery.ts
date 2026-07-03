'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  searchYoutubeVideos,
  type SearchApiErrorResponse,
  type YoutubeSearchResult,
} from '../api/searchApi';

export const youtubeSearchQueryKeys = {
  search: (query: string) => ['youtube-search', query] as const,
};

export const useYoutubeSearchQuery = (
  query: string,
): UseQueryResult<YoutubeSearchResult[], SearchApiErrorResponse> => {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: youtubeSearchQueryKeys.search(normalizedQuery),
    queryFn: () => searchYoutubeVideos(normalizedQuery),
    enabled: normalizedQuery.length > 0,
  });
};
