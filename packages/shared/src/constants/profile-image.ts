export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_IMAGE_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type ProfileImageMimeType = (typeof PROFILE_IMAGE_ALLOWED_MIME_TYPES)[number];
