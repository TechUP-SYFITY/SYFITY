import { config } from '../config';

export function isAllowedOrigin(origin: string): boolean {
  return config.allowedOrigins.includes(origin);
}
