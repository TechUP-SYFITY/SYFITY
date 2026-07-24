// closed Room 비활성화 확인 UI의 기본, pending, 오류 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeactivateRoomAction } from './DeactivateRoomAction';

describe('DeactivateRoomAction', () => {
  afterEach(cleanup);

  it('되돌릴 수 없는 비활성화 동작임을 확인한다', () => {
    const onConfirm = vi.fn();
    render(<DeactivateRoomAction roomName="지난 Room" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 비활성화' }));

    expect(screen.getByRole('dialog', { name: 'Room을 비활성화할까요?' })).toBeInTheDocument();
    expect(screen.getByText(/다시 복구하거나 입장할 수 없습니다/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Room 비활성화 확인' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('비활성화 요청 중에는 Dialog를 닫거나 중복 실행할 수 없다', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <DeactivateRoomAction roomName="지난 Room" onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 비활성화' }));
    rerender(<DeactivateRoomAction roomName="지난 Room" isPending onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole('button', { name: 'Room 비활성화 확인' });
    expect(confirmButton).toBeDisabled();
    expect(confirmButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('비활성화 실패 메시지를 Dialog 안에 표시한다', () => {
    render(
      <DeactivateRoomAction
        roomName="지난 Room"
        errorMessage="이 작업을 할 권한이 없어요."
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 비활성화' }));
    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없어요.');
  });
});
