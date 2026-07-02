import { apiClient } from '@/shared/lib/api/apiClient';

import type { SearchVideo, YoutubeSearchResponse } from '../types/search';

export const searchApi = {
  async searchVideos(query: string): Promise<SearchVideo[]> {
    const params = new URLSearchParams({ q: query.trim() });
    const response = await apiClient.get<YoutubeSearchResponse>(`/search?${params.toString()}`);

    return response.data.items;
  },
};
