import NodeCache from 'node-cache';

import type { ICache } from './cache.interface';

export class NodeCacheStore implements ICache {
  private readonly cache: NodeCache;

  constructor(defaultTtl = 300) {
    this.cache = new NodeCache({ stdTTL: defaultTtl });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (ttlSeconds !== undefined) {
      this.cache.set(key, value, ttlSeconds);
      return;
    }

    this.cache.set(key, value);
  }

  del(key: string): void {
    this.cache.del(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}
