import { http, HttpResponse } from 'msw';

import type { SearchResponse } from '@syfity/shared';

import { roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';

export const searchHandlers = [
  http.get(`${API}/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.toLowerCase() ?? '';
    const items = roomFixture.playlist
      .filter((item) => {
        if (!query) {
          return true;
        }

        return (
          item.title.toLowerCase().includes(query) ||
          item.channelTitle.toLowerCase().includes(query)
        );
      })
      .map(({ channelTitle, duration, thumbnailUrl, title, videoId }) => ({
        channelTitle,
        duration,
        thumbnailUrl,
        title,
        videoId,
      }));

    return HttpResponse.json({
      success: true,
      data: { items },
    } satisfies SearchResponse);
  }),
];
