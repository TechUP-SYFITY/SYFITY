import { describe, expect, it } from 'vitest';

import { extractStoragePath } from './extractStoragePath';

describe('extractStoragePath', () => {
  it('Supabase 공개 URL에서 해당 버킷 내부 경로를 추출한다', () => {
    expect(
      extractStoragePath(
        'https://project.supabase.co/storage/v1/object/public/profile-images/user-id/image.png',
        'profile-images',
      ),
    ).toBe('user-id/image.png');
  });

  it('다른 버킷 또는 외부 URL은 정리 대상이 아닌 null을 반환한다', () => {
    expect(
      extractStoragePath(
        'https://project.supabase.co/storage/v1/object/public/other-bucket/user-id/image.png',
        'profile-images',
      ),
    ).toBeNull();
    expect(extractStoragePath('https://example.com/image.png', 'profile-images')).toBeNull();
  });
});
