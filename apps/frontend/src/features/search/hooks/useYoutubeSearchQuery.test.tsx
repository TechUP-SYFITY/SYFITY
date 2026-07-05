import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { useYoutubeSearchQuery, youtubeSearchQueryKeys } from './useYoutubeSearchQuery';
import { searchYoutubeVideos, type YoutubeSearchResult } from '../api/searchApi';

vi.mock('../api/searchApi', () => ({
  searchYoutubeVideos: vi.fn(),
}));

const searchYoutubeVideosMock = vi.mocked(searchYoutubeVideos);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('useYoutubeSearchQuery', () => {
  beforeEach(() => {
    searchYoutubeVideosMock.mockReset();
  });

  it('builds a query key from the search query', () => {
    expect(youtubeSearchQueryKeys.search('lofi')).toEqual(['youtube-search', 'lofi']);
  });

  it('does not request the API when query is empty', () => {
    const { result } = renderHook(() => useYoutubeSearchQuery('   '), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(searchYoutubeVideosMock).not.toHaveBeenCalled();
  });

  it('trims query and returns search results', async () => {
    const items: YoutubeSearchResult[] = [
      {
        videoId: 'video-1',
        title: 'Test Song',
        channelTitle: 'Test Channel',
        thumbnailUrl: 'https://i.ytimg.com/vi/video-1/default.jpg',
        duration: 180,
      },
    ];
    searchYoutubeVideosMock.mockResolvedValue(items);

    const { result } = renderHook(() => useYoutubeSearchQuery('  lofi  '), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchYoutubeVideosMock).toHaveBeenCalledWith('lofi');
    expect(result.current.data).toEqual(items);
  });

  it('exposes API errors through React Query error state', async () => {
    const errorResponse = new ApiClientError(
      {
        code: 'SERVER_YOUTUBE_API_ERROR',
        message: 'YouTube API request failed',
      },
      502,
    );
    searchYoutubeVideosMock.mockRejectedValue(errorResponse);

    const { result } = renderHook(() => useYoutubeSearchQuery('error case'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(errorResponse);
  });
});
