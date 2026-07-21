// Host Room 종료 확인과 Member 즉시 퇴장 UI의 역할별 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomExitAction } from './RoomExitAction';

describe('RoomExitAction', () => {
  afterEach(() => {
    cleanup();
  });

  it('Host에게 Room 종료 확인 Dialog만 제공한다', () => {
    const onConfirm = vi.fn();
    render(<RoomExitAction role="host" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Room 종료' }));

    expect(screen.getByRole('dialog', { name: 'Room을 종료할까요?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '나가기' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Room 종료 확인' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Member는 확인 Dialog 없이 즉시 나가기 동작을 실행한다', () => {
    const onConfirm = vi.fn();
    render(<RoomExitAction role="member" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: '나가기' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Room 종료' })).toBeNull();
  });

  it('Host 종료 요청 중에는 Dialog를 닫거나 확인을 중복 실행할 수 없다', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<RoomExitAction role="host" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Room 종료' }));
    rerender(<RoomExitAction role="host" isPending onConfirm={onConfirm} />);

    expect(screen.getByRole('button', { name: 'Room 종료 확인' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Room 종료 확인' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Host 종료 실패 메시지를 Dialog 안에 표시한다', () => {
    render(
      <RoomExitAction
        role="host"
        errorMessage="Room 종료 요청에 실패했어요."
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Room 종료' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Room 종료 요청에 실패했어요.');
  });
});
