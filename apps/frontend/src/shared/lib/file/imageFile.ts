import {
  ERROR_CODES,
  PROFILE_IMAGE_ALLOWED_MIME_TYPES,
  PROFILE_IMAGE_MAX_BYTES,
} from '@syfity/shared';

export function validateProfileImageFile(file: File): string | null {
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return ERROR_CODES.USER_PROFILE_IMAGE_TOO_LARGE;
  }
  if (
    !PROFILE_IMAGE_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof PROFILE_IMAGE_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return ERROR_CODES.USER_PROFILE_IMAGE_INVALID_TYPE;
  }
  return null;
}
