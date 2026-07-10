import { describe, expect, it } from 'vitest';

import { hashToken } from './tokenHash';

describe('hashToken', () => {
  it('동일한 입력에 대해 항상 같은 해시를 반환한다', () => {
    expect(hashToken('same-token')).toBe(hashToken('same-token'));
  });

  it('다른 입력에 대해 다른 해시를 반환한다', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('원문을 그대로 반환하지 않는다', () => {
    expect(hashToken('plain-refresh-token')).not.toBe('plain-refresh-token');
  });
});
