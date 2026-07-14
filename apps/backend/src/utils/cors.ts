import { config } from '../config';
import { logger } from '../lib/logger';

function compilePreviewOriginPattern(): RegExp | undefined {
  if (!config.vercelPreviewOriginPattern) return undefined;

  try {
    return new RegExp(config.vercelPreviewOriginPattern);
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
