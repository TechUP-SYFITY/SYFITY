import { describe, expect, it, vi } from 'vitest';

import { YoutubeMetadataRefreshService } from './youtube-metadata-refresh.service';

function video(
  videoId: string,
  overrides: Partial<{ embeddable: boolean; madeForKids: boolean }> = {},
) {
  return {
    videoId,
    title: `Title ${videoId}`,
    channelTitle: 'Channel',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: 180,
    embeddable: true,
    madeForKids: false,
    categoryId: '10',
    ...overrides,
  };
}

describe('YoutubeMetadataRefreshService', () => {
  it('재생 가능한 영상만 available 메타데이터로 변환한다', async () => {
    const youtubeClient = {
      getVideoDetails: vi
        .fn()
        .mockResolvedValue([
          video('available'),
          video('not-embeddable', { embeddable: false }),
          video('kids', { madeForKids: true }),
        ]),
    };
    const service = new YoutubeMetadataRefreshService(youtubeClient);

    await expect(
      service.refreshVideoMetadata(['available', 'not-embeddable', 'kids', 'missing']),
    ).resolves.toEqual(
      new Map([
        [
          'available',
          {
            status: 'available',
            title: 'Title available',
            channelTitle: 'Channel',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            duration: 180,
          },
        ],
        ['not-embeddable', { status: 'unavailable' }],
        ['kids', { status: 'unavailable' }],
        ['missing', { status: 'unavailable' }],
      ]),
    );
  });

  it('YouTube videos.list 한도인 50개씩 나누어 조회한다', async () => {
    const youtubeClient = { getVideoDetails: vi.fn().mockResolvedValue([]) };
    const service = new YoutubeMetadataRefreshService(youtubeClient);
    const ids = Array.from({ length: 51 }, (_, index) => `video-${index}`);

    const result = await service.refreshVideoMetadata(ids);

    expect(youtubeClient.getVideoDetails).toHaveBeenCalledTimes(2);
    expect(youtubeClient.getVideoDetails).toHaveBeenNthCalledWith(1, ids.slice(0, 50));
    expect(youtubeClient.getVideoDetails).toHaveBeenNthCalledWith(2, ids.slice(50));
    expect(result.get('video-50')).toEqual({ status: 'unavailable' });
  });
});
