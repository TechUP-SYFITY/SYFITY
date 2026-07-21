import { describe, expect, it } from 'vitest';

import { maskProfanity } from './profanityFilter';

describe('maskProfanity', () => {
  it('한국어 비속어를 마스킹한다', () => {
    expect(maskProfanity('정말 씨발')).toBe('정말 **');
  });

  it('지원 목록에 있는 초성 축약 비속어를 마스킹한다', () => {
    expect(maskProfanity('ㅅㅂ')).toBe('**');
  });

  it('지원 목록에 있는 자소 분리 비속어를 마스킹한다', () => {
    expect(maskProfanity('ㅁㅣ친놈')).toBe('****');
  });

  it('일반 메시지는 변경하지 않는다', () => {
    expect(maskProfanity('좋은 음악이에요')).toBe('좋은 음악이에요');
  });
});
