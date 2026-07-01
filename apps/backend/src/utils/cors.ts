import { config } from '../config';

export function isAllowedOrigin(origin: string): boolean {
  if (config.allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
}
