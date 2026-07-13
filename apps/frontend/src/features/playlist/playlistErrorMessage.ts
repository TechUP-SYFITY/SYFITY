import { ApiClientError } from '@/shared/types/api';

export function getPlaylistErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === 'PLAYLIST_INVALID_URL') {
      return '유효한 YouTube 링크를 입력해주세요.';
    }

    if (error.code === 'PLAYLIST_VIDEO_UNAVAILABLE') {
      return '재생할 수 없는 영상이에요.';
    }

    if (error.code === 'AUTH_FORBIDDEN') {
      return '이 작업을 할 권한이 없어요.';
    }

    if (error.code === 'PLAYLIST_ITEM_NOT_FOUND') {
      return '이미 삭제됐거나 찾을 수 없는 곡이에요.';
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.';
    }

    return error.message;
  }

  return '잠시 후 다시 시도해주세요.';
}
