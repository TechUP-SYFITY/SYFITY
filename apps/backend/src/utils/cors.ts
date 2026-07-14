import { config } from '../config';
import { logger } from '../lib/logger';

function compilePreviewOriginPattern(): RegExp | undefined {
  const pattern = config.vercelPreviewOriginPattern;
  if (!pattern) return undefined;

  if (!pattern.startsWith('^') || !pattern.endsWith('$')) {
    logger.warn(
      { pattern },
      'VERCEL_PREVIEW_ORIGIN_PATTERN은 전체 origin을 검증하도록 ^와 $ 앵커를 포함해야 합니다. Preview origin 허용을 비활성화합니다.',
    );
    return undefined;
  }

  try {
    return new RegExp(pattern);
  } catch (error) {
    logger.warn(
      { error },
      'VERCEL_PREVIEW_ORIGIN_PATTERN이 올바른 정규식이 아닙니다. Preview origin 허용을 비활성화합니다.',
    );
    return undefined;
  }
}

const previewOriginPattern = compilePreviewOriginPattern();

export function isAllowedOrigin(origin: string): boolean {
  if (config.allowedOrigins.includes(origin)) return true;
  return previewOriginPattern?.test(origin) ?? false;
}
