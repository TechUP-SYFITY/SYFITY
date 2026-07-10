import pino from 'pino';

import { config } from '../config';

function resolveLevel(): pino.LevelWithSilent {
  if (config.nodeEnv === 'production') return 'info';
  if (config.nodeEnv === 'test') return 'silent';
  return 'debug';
}

export const logger = pino({
  level: resolveLevel(),
  // pino-pretty는 워커 스레드를 띄우므로 개발 환경에서만 사용한다.
  // 테스트 환경(vitest)은 모듈을 자주 리로드(vi.resetModules)하므로,
  // 매번 새 워커를 띄우면 프로세스 종료 리스너가 누적되어 경고가 발생한다.
  transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});
