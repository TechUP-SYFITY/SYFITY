import type { ICache } from './cache.interface';
import { NodeCacheStore } from './node-cache.store';

export const cache: ICache = new NodeCacheStore();
