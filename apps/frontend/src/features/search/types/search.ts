export const SEARCH_RESULT_STATUS = {
  idle: 'idle',
  loading: 'loading',
  success: 'success',
  empty: 'empty',
  error: 'error',
} as const;

export type SearchResultStatus = (typeof SEARCH_RESULT_STATUS)[keyof typeof SEARCH_RESULT_STATUS];

export interface SearchVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
}

export interface YoutubeSearchResponse {
  success: true;
  data: {
    items: SearchVideo[];
  };
}
