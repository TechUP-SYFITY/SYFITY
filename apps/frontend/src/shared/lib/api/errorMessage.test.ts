import { describe, expect, it } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { getApiErrorMessage } from './errorMessage';

describe('getApiErrorMessage', () => {
  it.each([
    ['PLAYLIST_INVALID_URL', '유효한 YouTube 링크를 입력해주세요.'],
    ['PLAYLIST_VIDEO_UNAVAILABLE', '재생할 수 없는 영상이에요.'],
    ['PLAYLIST_DUPLICATE_VIDEO', '이미 플레이리스트에 추가된 곡이에요.'],
    ['PLAYLIST_ITEM_NOT_FOUND', '이미 삭제됐거나 찾을 수 없는 곡이에요.'],
    ['ROOM_NOT_FOUND', '존재하지 않거나 입장할 수 없는 Room입니다.'],
    ['ROOM_CLOSED', '이미 종료된 Room입니다.'],
    ['ROOM_INACTIVE', '현재 이용할 수 없는 Room입니다.'],
    ['ROOM_ACCESS_DENIED', '이 Room에 참여한 이력이 없어요. 초대 링크로 다시 입장해주세요.'],
    ['AUTH_FORBIDDEN', '이 작업을 할 권한이 없어요.'],
  ])('%s 오류를 사용자용 문구로 변환한다', (code, message) => {
    const error = new ApiClientError({ code, message: 'API error' }, 400);

    expect(getApiErrorMessage(error)).toBe(message);
  });

  it('등록되지 않은 API 오류는 서버 문구를 유지한다', () => {
    const error = new ApiClientError(
      { code: 'SERVER_YOUTUBE_API_ERROR', message: '검색 실패' },
      500,
    );

    expect(getApiErrorMessage(error)).toBe('검색 실패');
  });

  it('호출부가 지정한 코드 문구를 공통 문구보다 우선한다', () => {
    const error = new ApiClientError({ code: 'AUTH_FORBIDDEN', message: '권한이 없습니다.' }, 403);

    expect(
      getApiErrorMessage(error, {
        codeOverrides: { AUTH_FORBIDDEN: 'Host만 재생을 제어할 수 있어요.' },
      }),
    ).toBe('Host만 재생을 제어할 수 있어요.');
  });

  it('네트워크 연결 실패를 안내 문구로 변환한다', () => {
    expect(getApiErrorMessage(new Error('Failed to fetch'))).toBe(
      '서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.',
    );
  });
});
