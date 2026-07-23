// YouTube 클라이언트 생성 지점을 한 곳으로 모은다.
// E2E 스텁 분기를 여기서만 하도록 강제해, 스텁이 다른 코드로 새지 않게 한다.
import { logger } from '../logger';
import { FakeYouTubeClient } from './fake-youtube.client';
import { YouTubeClient, type IYouTubeClient } from './youtube.client';

export interface YouTubeClientOptions {
  apiKey: string;
  nodeEnv: string;
  e2eMode: boolean;
}

/**
 * 운영에서는 `E2E_MODE`가 어떤 값이든 무시하고 항상 실제 클라이언트를 반환한다.
 * 스텁이 운영에 새면 검색·곡 추가가 조용히 가짜 데이터를 반환하게 되므로,
 * 이 가드는 환경변수 설정 실수에 대한 마지막 방어선이다.
 */
export function createYouTubeClient({
  apiKey,
  nodeEnv,
  e2eMode,
}: YouTubeClientOptions): IYouTubeClient {
  if (e2eMode && nodeEnv !== 'production') {
    logger.warn('[youtube] E2E_MODE가 켜져 있어 FakeYouTubeClient를 사용합니다.');
    return new FakeYouTubeClient();
  }

  return new YouTubeClient(apiKey);
}
