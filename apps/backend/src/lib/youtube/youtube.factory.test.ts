import { describe, expect, it, vi } from 'vitest';

import { FakeYouTubeClient } from './fake-youtube.client';
import { YouTubeClient } from './youtube.client';
import { createYouTubeClient } from './youtube.factory';

vi.mock('../logger', () => ({
  logger: { warn: vi.fn() },
}));

const options = { apiKey: 'test-api-key', nodeEnv: 'development', e2eMode: false };

describe('createYouTubeClient', () => {
  it('기본값은 실제 YouTubeClient다', () => {
    expect(createYouTubeClient(options)).toBeInstanceOf(YouTubeClient);
  });

  it('E2E_MODE가 켜지면 FakeYouTubeClient를 반환한다', () => {
    expect(createYouTubeClient({ ...options, e2eMode: true })).toBeInstanceOf(FakeYouTubeClient);
  });

  // 환경변수 설정 실수로 스텁이 운영에 새는 것을 막는 마지막 방어선.
  it('운영에서는 E2E_MODE가 켜져 있어도 실제 클라이언트를 반환한다', () => {
    const client = createYouTubeClient({ ...options, nodeEnv: 'production', e2eMode: true });

    expect(client).toBeInstanceOf(YouTubeClient);
    expect(client).not.toBeInstanceOf(FakeYouTubeClient);
  });
});
