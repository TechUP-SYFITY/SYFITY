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

  it('저장한 객체 참조를 그대로 반환한다', () => {
    const cache = new NodeCacheStore();
    const value = { kind: 'timer-ref' };

    cache.set('object', value);

    expect(cache.get<typeof value>('object')).toBe(value);
  });
});
