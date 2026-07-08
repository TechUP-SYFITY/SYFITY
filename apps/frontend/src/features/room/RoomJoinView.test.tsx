// Room 초대 코드 입장 화면의 상태 렌더링과 입력 정규화를 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseInviteCode, RoomJoinView, type RoomJoinState } from './RoomJoinView';

function renderRoomJoinView({
  code = '',
  state = 'default',
}: {
  code?: string;
  state?: RoomJoinState;
} = {}) {
  const props = {
    code,
    state,
    onCancel: vi.fn(),
    onCodeChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  render(<RoomJoinView {...props} />);

  return props;
}

describe('RoomJoinView', () => {
  afterEach(() => {
    cleanup();
  });

  it('초대 코드 기본 입력 화면을 렌더링한다', () => {
    renderRoomJoinView();

    expect(screen.getByRole('heading', { name: '초대 코드로 입장' })).toBeInTheDocument();
    expect(screen.getByLabelText('초대 코드')).toHaveAttribute('placeholder', '예: 3F9A2C');
    expect(screen.getByText('0 / 6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '입장하기' })).toBeDisabled();
  });

  it('6자리 초대 코드가 있으면 입장 버튼을 활성화하고 제출한다', () => {
    const props = renderRoomJoinView({ code: '3F9A2C' });

    fireEvent.click(screen.getByRole('button', { name: '입장하기' }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('잘못된 코드 상태를 destructive 메시지와 다시 시도 CTA로 표시한다', () => {
    renderRoomJoinView({ code: 'XK29ZQ', state: 'invalid-code' });

    expect(screen.getByText('유효하지 않은 초대 코드예요. 다시 확인해주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeEnabled();
  });

  it('입장 로딩 상태에서는 폼 대신 로딩 안내를 표시한다', () => {
    renderRoomJoinView({ code: '3F9A2C', state: 'loading' });

    expect(screen.getByText('방에 입장하는 중...')).toBeInTheDocument();
    expect(screen.getByText('잠시만 기다려주세요')).toBeInTheDocument();
    expect(screen.queryByLabelText('초대 코드')).not.toBeInTheDocument();
  });

  it('종료된 방과 비활성 방 상태를 구분해 표시한다', () => {
    const { rerender } = render(
      <RoomJoinView
        code="3F9A2C"
        state="closed"
        onCancel={vi.fn()}
        onCodeChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('이미 종료된 방이에요')).toBeInTheDocument();

    rerender(
      <RoomJoinView
        code="3F9A2C"
        state="inactive"
        onCancel={vi.fn()}
        onCodeChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('입장할 수 없는 방이에요')).toBeInTheDocument();
  });

  it('초대 링크와 일반 입력에서 6자리 초대 코드만 추출한다', () => {
    expect(parseInviteCode('https://syfity.app/room/join?code=3f9a2c')).toBe('3F9A2C');
    expect(parseInviteCode('xk29zq-extra')).toBe('XK29ZQ');
  });
});
