// closed Room 복구 확인 UI의 기본, pending, 오류 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecoverRoomAction } from './RecoverRoomAction';

describe('RecoverRoomAction', () => {
  afterEach(cleanup);

  it('복구 전 Playlist·채팅·재생 상태 초기화를 확인한다', () => {
    const onConfirm = vi.fn();
    render(<RecoverRoomAction roomName="지난 Room" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));

    expect(screen.getByRole('dialog', { name: 'Room을 복구할까요?' })).toBeInTheDocument();
    expect(screen.getByText(/Playlist·채팅·재생 상태가 초기화/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Room 복구 확인' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('복구 요청 중에는 Dialog를 닫거나 중복 실행할 수 없다', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<RecoverRoomAction roomName="지난 Room" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    rerender(<RecoverRoomAction roomName="지난 Room" isPending onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole('button', { name: 'Room 복구 확인' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('복구 실패 메시지를 Dialog 안에 표시한다', () => {
    render(
      <RecoverRoomAction
        roomName="지난 Room"
        errorMessage="이미 복구되었거나 복구할 수 없는 Room이에요."
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      '이미 복구되었거나 복구할 수 없는 Room이에요.',
    );
  });
});
