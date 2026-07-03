import type { SearchResponse } from '@syfity/shared';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

export type YoutubeSearchResult = SearchResponse['data']['items'][number];

export type SearchApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

const getApiBaseUrl = () => {
  return (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
};

const parseSearchApiError = async (response: Response): Promise<SearchApiErrorResponse> => {
  try {
    return (await response.json()) as SearchApiErrorResponse;
  } catch {
    return {
      success: false,
      error: {
        code: 'SERVER_INTERNAL_ERROR',
        message: 'Search request failed.',
      },
    };
  }
};

export const searchYoutubeVideos = async (query: string): Promise<YoutubeSearchResult[]> => {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${getApiBaseUrl()}/search?${params.toString()}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw await parseSearchApiError(response);
  }

  const body = (await response.json()) as SearchResponse;

  return body.data.items;
};
