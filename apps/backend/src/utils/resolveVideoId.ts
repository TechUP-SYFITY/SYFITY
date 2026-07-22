import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';

type VideoIdRequest = { videoId?: string; youtubeUrl?: string };

export function resolveVideoId(request: VideoIdRequest): string {
  const hasVideoId = typeof request.videoId === 'string' && request.videoId.length > 0;
  const hasYoutubeUrl = typeof request.youtubeUrl === 'string' && request.youtubeUrl.length > 0;

  if (hasVideoId === hasYoutubeUrl) {
    throw new AppError(
      400,
      ERROR_CODES.VALIDATION_ERROR,
      'videoId 또는 youtubeUrl 중 하나만 입력해야 합니다.',
    );
  }

  if (hasVideoId) {
    return request.videoId!;
  }

  const videoId = parseVideoIdFromUrl(request.youtubeUrl!);
  if (!videoId) {
    throw new AppError(400, ERROR_CODES.PLAYLIST_INVALID_URL, 'YouTube URL이 올바르지 않습니다.');
  }

  return videoId;
}

function parseVideoIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname === 'youtu.be') {
    return nonEmpty(parsed.pathname.split('/')[1]);
  }

  if (
    parsed.hostname !== 'youtube.com' &&
    parsed.hostname !== 'www.youtube.com' &&
    parsed.hostname !== 'music.youtube.com'
  ) {
    return null;
  }

  if (parsed.pathname === '/watch') {
    return nonEmpty(parsed.searchParams.get('v'));
  }

  if (parsed.pathname.startsWith('/embed/')) {
    return nonEmpty(parsed.pathname.split('/')[2]);
  }

  if (parsed.pathname.startsWith('/shorts/')) {
    return nonEmpty(parsed.pathname.split('/')[2]);
  }

  return null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}
