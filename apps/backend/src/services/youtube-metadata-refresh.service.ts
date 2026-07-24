import type { IYouTubeClient } from '../lib/youtube/youtube.client';
import type { RefreshedVideoMetadata } from '../types/youtube-metadata';
import { chunk } from '../utils/chunk';

export type { RefreshedVideoMetadata } from '../types/youtube-metadata';

const YOUTUBE_VIDEOS_LIST_CHUNK_SIZE = 50;

export class YoutubeMetadataRefreshService {
  constructor(private readonly youtubeClient: Pick<IYouTubeClient, 'getVideoDetails'>) {}

  async refreshVideoMetadata(videoIds: string[]): Promise<Map<string, RefreshedVideoMetadata>> {
    const results = new Map<string, RefreshedVideoMetadata>();
    for (const videoIdsChunk of chunk(videoIds, YOUTUBE_VIDEOS_LIST_CHUNK_SIZE)) {
      const details = await this.youtubeClient.getVideoDetails(videoIdsChunk);
      const detailsById = new Map(details.map((detail) => [detail.videoId, detail]));
      for (const videoId of videoIdsChunk) {
        const detail = detailsById.get(videoId);
        results.set(
          videoId,
          !detail || !detail.embeddable || detail.madeForKids
            ? { status: 'unavailable' }
            : {
                status: 'available',
                title: detail.title,
                channelTitle: detail.channelTitle,
                thumbnailUrl: detail.thumbnailUrl,
                duration: detail.duration,
              },
        );
      }
    }
    return results;
  }
}
