import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../../errors/appError';

export type YouTubeSearchItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
};

export type YouTubeVideoDetail = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  embeddable: boolean;
};

export interface IYouTubeClient {
  search(query: string, maxResults?: number): Promise<YouTubeSearchItem[]>;
  getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetail[]>;
}

type YouTubeErrorBody = {
  error?: {
    code?: number;
    errors?: Array<{ reason?: string }>;
  };
};

type YouTubeThumbnailSet = {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: YouTubeThumbnailSet;
    };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: YouTubeThumbnailSet;
    };
    contentDetails?: {
      duration?: string;
    };
    status?: {
      embeddable?: boolean;
    };
  }>;
};

export class YouTubeClient implements IYouTubeClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async search(query: string, maxResults = 10): Promise<YouTubeSearchItem[]> {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({
      q: query,
      part: 'snippet',
      type: 'video',
      maxResults: String(maxResults),
      key: this.apiKey,
    }).toString();

    const response = await this.fetchFn(url.toString());
    if (!response.ok) {
      const body = (await response.json().catch((): YouTubeErrorBody => ({}))) as YouTubeErrorBody;
      this.handleApiError(response.status, body);
    }

    const body = (await response.json()) as YouTubeSearchResponse;
    return (body.items ?? [])
      .filter((item) => Boolean(item.id?.videoId))
      .map((item) => ({
        videoId: item.id!.videoId!,
        title: item.snippet?.title ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnailUrl: this.getThumbnailUrl(item.snippet?.thumbnails),
      }));
  }

  async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetail[]> {
    if (videoIds.length === 0) {
      return [];
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({
      id: videoIds.join(','),
      part: 'snippet,contentDetails,status',
      key: this.apiKey,
    }).toString();

    const response = await this.fetchFn(url.toString());
    if (!response.ok) {
      const body = (await response.json().catch((): YouTubeErrorBody => ({}))) as YouTubeErrorBody;
      this.handleApiError(response.status, body);
    }

    const body = (await response.json()) as YouTubeVideosResponse;
    return (body.items ?? [])
      .filter((item) => Boolean(item.id))
      .map((item) => ({
        videoId: item.id!,
        title: item.snippet?.title ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnailUrl: this.getThumbnailUrl(item.snippet?.thumbnails),
        duration: this.parseDuration(item.contentDetails?.duration ?? ''),
        embeddable: item.status?.embeddable ?? true,
      }));
  }

  private parseDuration(iso8601: string): number {
    const match = iso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return 0;
    }

    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2] ?? 0);
    const seconds = Number(match[3] ?? 0);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    return Number.isNaN(totalSeconds) || totalSeconds === 0 ? 0 : totalSeconds;
  }

  private handleApiError(status: number, body: YouTubeErrorBody): never {
    const reason = body.error?.errors?.[0]?.reason;
    if (status === 403 && reason === 'quotaExceeded') {
      throw new AppError(
        429,
        ERROR_CODES.SERVER_YOUTUBE_QUOTA_EXCEEDED,
        'YouTube API 일일 쿼터를 초과했습니다.',
      );
    }

    throw new AppError(
      502,
      ERROR_CODES.SERVER_YOUTUBE_API_ERROR,
      'YouTube API 호출에 실패했습니다.',
    );
  }

  private getThumbnailUrl(thumbnails?: YouTubeThumbnailSet): string {
    return thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? '';
  }
}
