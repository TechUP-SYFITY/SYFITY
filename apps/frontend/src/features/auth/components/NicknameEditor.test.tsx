import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({ useUpdateNickname: vi.fn() }));

import { NicknameEditor } from './NicknameEditor';
import { useUpdateNickname } from '../hooks/useAuth';

const mutate = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NicknameEditor', () => {
  it('처음에는 닉네임 텍스트와 수정하기 버튼만 보인다', () => {
    vi.mocked(useUpdateNickname).mockReturnValue({
      isPending: false,
      isError: false,
      mutate,
    } as never);
    render(<NicknameEditor initialNickname="Alice" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeInTheDocument();
  });

  it('초기 닉네임 또는 공백만 입력된 상태에서는 저장할 수 없다', () => {
    vi.mocked(useUpdateNickname).mockReturnValue({
      isPending: false,
      isError: false,
      mutate,
    } as never);
    render(<NicknameEditor initialNickname="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    const input = screen.getByDisplayValue('Alice');
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  it('변경한 닉네임을 저장 mutation으로 전달한다', () => {
    vi.mocked(useUpdateNickname).mockReturnValue({
      isPending: false,
      isError: false,
      mutate,
    } as never);
    render(<NicknameEditor initialNickname="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(mutate).toHaveBeenCalledWith(
      'New name',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('취소를 누르면 편집을 종료하고 원래 닉네임으로 되돌린다', () => {
    vi.mocked(useUpdateNickname).mockReturnValue({
      isPending: false,
      isError: false,
      mutate,
    } as never);
    render(<NicknameEditor initialNickname="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('저장 실패 메시지를 표시한다', () => {
    vi.mocked(useUpdateNickname).mockReturnValue({
      isPending: false,
      isError: true,
      mutate,
    } as never);
    render(<NicknameEditor initialNickname="Alice" />);

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    expect(screen.getByText('닉네임을 저장하지 못했어요.')).toBeInTheDocument();
  });
});
