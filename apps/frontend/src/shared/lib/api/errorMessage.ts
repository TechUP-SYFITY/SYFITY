import type { ErrorCode } from '@syfity/shared';

import { ApiClientError } from '@/shared/types/api';

const API_ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  AUTH_FORBIDDEN: '이 작업을 할 권한이 없어요.',
  PERSONAL_PLAYLIST_ACCESS_DENIED: '내 플레이리스트가 아니에요.',
  PERSONAL_PLAYLIST_DUPLICATE_VIDEO: '이미 이 플레이리스트에 추가된 곡이에요.',
  PERSONAL_PLAYLIST_ITEM_NOT_FOUND: '이미 삭제됐거나 찾을 수 없는 곡이에요.',
  PERSONAL_PLAYLIST_NOT_FOUND: '이미 삭제됐거나 찾을 수 없는 플레이리스트예요.',
  PLAYLIST_DUPLICATE_VIDEO: '이미 플레이리스트에 추가된 곡이에요.',
  PLAYLIST_INVALID_URL: '유효한 YouTube 링크를 입력해주세요.',
  PLAYLIST_ITEM_NOT_FOUND: '이미 삭제됐거나 찾을 수 없는 곡이에요.',
  PLAYLIST_NOT_MUSIC: '음악 영상만 추가할 수 있어요.',
  PLAYLIST_VIDEO_UNAVAILABLE: '재생할 수 없는 영상이에요.',
  ROOM_ACCESS_DENIED: '이 Room에 참여한 이력이 없어요. 초대 링크로 다시 입장해주세요.',
  ROOM_CLOSED: '이미 종료된 Room입니다.',
  ROOM_INACTIVE: '현재 이용할 수 없는 Room입니다.',
  ROOM_NOT_FOUND: '존재하지 않거나 입장할 수 없는 Room입니다.',
};

interface GetApiErrorMessageOptions {
  codeOverrides?: Partial<Record<ErrorCode, string>>;
}

export function getApiErrorMessage(
  error: unknown,
  { codeOverrides = {} }: GetApiErrorMessageOptions = {},
): string {
  if (error instanceof ApiClientError) {
    const code = error.code as ErrorCode;
    return codeOverrides[code] ?? API_ERROR_MESSAGES[code] ?? error.message;
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.';
    }

    return error.message;
  }

  return '잠시 후 다시 시도해주세요.';
}
