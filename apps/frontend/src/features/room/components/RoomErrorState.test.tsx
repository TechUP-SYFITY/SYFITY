import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { RoomErrorState } from './RoomErrorState';

const renderError = (error: unknown) => render(<RoomErrorState error={error} roomId="room-1" />);

describe('RoomErrorState', () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ['ROOM_NOT_FOUND', '존재하지 않거나 입장할 수 없는 Room입니다.'],
    ['ROOM_CLOSED', '이미 종료된 Room입니다.'],
    ['ROOM_INACTIVE', '현재 이용할 수 없는 Room입니다.'],
    ['ROOM_ACCESS_DENIED', '이 Room에 참여한 이력이 없어요. 초대 링크로 다시 입장해주세요.'],
  ])('%s 에러 문구를 렌더링한다', (code, message) => {
    renderError(new ApiClientError({ code, message: 'backend message' }, 403));

    expect(screen.getByText('Room에 입장하지 못했어요')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('네트워크 연결 실패 문구를 렌더링한다', () => {
    renderError(new Error('Failed to fetch'));

    expect(
      screen.getByText('서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.'),
    ).toBeInTheDocument();
  });
});
