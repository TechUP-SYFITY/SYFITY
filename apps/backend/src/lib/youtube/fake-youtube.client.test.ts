import { describe, expect, it } from 'vitest';

import { FAKE_YOUTUBE_CATALOG, FakeYouTubeClient } from './fake-youtube.client';
import { YOUTUBE_MUSIC_CATEGORY_ID } from './youtube.client';

describe('FakeYouTubeClient', () => {
  const client = new FakeYouTubeClient();

  describe('search', () => {
    it('제목에 검색어가 포함된 항목을 반환한다', async () => {
      const results = await client.search('테스트 트랙 01');

      expect(results).toEqual([
        {
          videoId: 'e2eTrack001',
          title: 'E2E 테스트 트랙 01',
          channelTitle: 'Syfity E2E Channel',
          thumbnailUrl: expect.stringContaining('data:image/png;base64,'),
        },
      ]);
    });

    // SearchService가 50건을 요청하므로, 카탈로그 전체를 받으려면 maxResults를 넘겨야 한다.
    it('채널명으로도 검색된다', async () => {
      const results = await client.search('Syfity E2E Channel', 50);

      expect(results).toHaveLength(FAKE_YOUTUBE_CATALOG.length);
    });

    it('대소문자를 구분하지 않는다', async () => {
      const results = await client.search('syfity e2e channel', 50);

      expect(results).toHaveLength(FAKE_YOUTUBE_CATALOG.length);
    });

    it('maxResults 기본값은 10이다', async () => {
      await expect(client.search('Syfity E2E Channel')).resolves.toHaveLength(10);
    });

    it('일치하는 항목이 없으면 빈 배열을 반환한다', async () => {
      await expect(client.search('존재하지 않는 검색어')).resolves.toEqual([]);
    });

    it('maxResults만큼만 반환한다', async () => {
      const results = await client.search('E2E', 3);

      expect(results).toHaveLength(3);
    });

    it('같은 입력에 항상 같은 결과를 반환한다', async () => {
      const [first, second] = await Promise.all([client.search('E2E'), client.search('E2E')]);

      expect(first).toEqual(second);
    });
  });

  describe('getVideoDetails', () => {
    it('요청한 순서를 유지한다', async () => {
      const details = await client.getVideoDetails(['e2eTrack003', 'e2eTrack001']);

      expect(details.map((detail) => detail.videoId)).toEqual(['e2eTrack003', 'e2eTrack001']);
    });

    it('카탈로그에 없는 videoId는 결과에서 제외한다', async () => {
      const details = await client.getVideoDetails(['e2eTrack001', 'unknownVideo']);

      expect(details.map((detail) => detail.videoId)).toEqual(['e2eTrack001']);
    });

    it('빈 배열을 넘기면 빈 배열을 반환한다', async () => {
      await expect(client.getVideoDetails([])).resolves.toEqual([]);
    });

    it('임베드 불가 곡을 제공한다', async () => {
      const [video] = await client.getVideoDetails(['e2eNoEmbed1']);

      expect(video.embeddable).toBe(false);
      expect(video.categoryId).toBe(YOUTUBE_MUSIC_CATEGORY_ID);
    });

    it('음악이 아닌 카테고리 영상을 제공한다', async () => {
      const [video] = await client.getVideoDetails(['e2eNonMusic']);

      expect(video.categoryId).not.toBe(YOUTUBE_MUSIC_CATEGORY_ID);
    });
  });

  describe('카탈로그', () => {
    it('videoId는 실제 YouTube와 같은 11자다', () => {
      for (const video of FAKE_YOUTUBE_CATALOG) {
        expect(video.videoId).toHaveLength(11);
      }
    });

    it('videoId가 중복되지 않는다', () => {
      const videoIds = FAKE_YOUTUBE_CATALOG.map((video) => video.videoId);

      expect(new Set(videoIds).size).toBe(videoIds.length);
    });

    it('썸네일은 외부 요청이 없는 data URI다', () => {
      for (const video of FAKE_YOUTUBE_CATALOG) {
        expect(video.thumbnailUrl.startsWith('data:image/')).toBe(true);
      }
    });
  });
});
