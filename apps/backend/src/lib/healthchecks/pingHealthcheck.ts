import { logger } from '../logger';

export async function pingHealthcheck(url: string | undefined): Promise<void> {
  if (!url) return;
  try {
    await fetch(url, { method: 'GET' });
  } catch (error) {
    logger.warn({ error, url }, '[pingHealthcheck] 핑 전송 실패(무시)');
  }
}
