'use client';

import { useQuery } from '@tanstack/react-query';

import { searchApi } from '../api/searchApi';

export function useYoutubeSearch(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ['youtube-search', normalizedQuery],
    queryFn: () => searchApi.searchVideos(normalizedQuery),
    enabled: normalizedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: false,
  });
}
