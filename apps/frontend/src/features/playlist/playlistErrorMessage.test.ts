import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { getPlaylistErrorMessage } from './playlistErrorMessage';

describe('getPlaylistErrorMessage', () => {
  it.each([
    ['PLAYLIST_INVALID_URL', '유효한 YouTube 링크를 입력해주세요.'],
    ['PLAYLIST_VIDEO_UNAVAILABLE', '재생할 수 없는 영상이에요.'],
    ['AUTH_FORBIDDEN', '이 작업을 할 권한이 없어요.'],
    ['PLAYLIST_ITEM_NOT_FOUND', '이미 삭제됐거나 찾을 수 없는 곡이에요.'],
  ])('%s 오류를 사용자용 문구로 변환한다', (code, message) => {
    const error = new ApiClientError({ code, message: 'API error' }, 400);

    expect(getPlaylistErrorMessage(error)).toBe(message);
  });

  it('네트워크 연결 실패를 안내 문구로 변환한다', () => {
    expect(getPlaylistErrorMessage(new Error('Failed to fetch'))).toBe(
      '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.',
    );
  });
});
