import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { resolveVideoId } from './resolveVideoId';

describe('resolveVideoId', () => {
  it('videoId를 그대로 반환한다', () => {
    expect(resolveVideoId({ videoId: 'video-1' })).toBe('video-1');
  });

  it.each([
    ['https://youtu.be/video-1', 'video-1'],
    ['https://www.youtube.com/watch?v=video-2', 'video-2'],
    ['https://www.youtube.com/embed/video-3', 'video-3'],
    ['https://www.youtube.com/shorts/video-4', 'video-4'],
  ])('%s URL을 파싱한다', (youtubeUrl, videoId) => {
    expect(resolveVideoId({ youtubeUrl })).toBe(videoId);
  });

  it.each([{ videoId: 'video-1', youtubeUrl: 'https://youtu.be/video-1' }, {}])(
    'videoId와 youtubeUrl이 정확히 하나가 아니면 VALIDATION_ERROR를 던진다',
    (request) => {
      expect(() => resolveVideoId(request)).toThrow(
        expect.objectContaining({ status: 400, code: ERROR_CODES.VALIDATION_ERROR }),
      );
    },
  );

  it('파싱할 수 없는 URL은 PLAYLIST_INVALID_URL을 던진다', () => {
    expect(() => resolveVideoId({ youtubeUrl: 'https://example.com/watch?v=video-1' })).toThrow(
      expect.objectContaining({ status: 400, code: ERROR_CODES.PLAYLIST_INVALID_URL }),
    );
  });
});
