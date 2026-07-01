import { describe, expect, it } from 'vitest';

import { NodeCacheStore } from './node-cache.store';

describe('NodeCacheStore', () => {
  it('set/get/has/del을 지원한다', () => {
    const cache = new NodeCacheStore();

    cache.set('test', 'value');

    expect(cache.has('test')).toBe(true);
    expect(cache.get<string>('test')).toBe('value');

    cache.del('test');

    expect(cache.has('test')).toBe(false);
    expect(cache.get<string>('test')).toBeUndefined();
  });
});
