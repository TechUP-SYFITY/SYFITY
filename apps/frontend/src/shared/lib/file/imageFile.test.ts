import { describe, expect, it } from 'vitest';

import { ERROR_CODES, PROFILE_IMAGE_MAX_BYTES } from '@syfity/shared';

import { validateProfileImageFile } from './imageFile';

describe('validateProfileImageFile', () => {
  it('허용한 PNG, JPEG, WebP 형식은 통과시킨다', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(validateProfileImageFile(new File(['image'], 'profile', { type }))).toBeNull();
    }
  });

  it('5MB를 초과한 파일은 업로드 전에 차단한다', () => {
    const file = new File([new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1)], 'large.png', {
      type: 'image/png',
    });

    expect(validateProfileImageFile(file)).toBe(ERROR_CODES.USER_PROFILE_IMAGE_TOO_LARGE);
  });

  it('허용하지 않은 MIME 형식은 차단한다', () => {
    expect(
      validateProfileImageFile(new File(['image'], 'profile.gif', { type: 'image/gif' })),
    ).toBe(ERROR_CODES.USER_PROFILE_IMAGE_INVALID_TYPE);
  });
});
