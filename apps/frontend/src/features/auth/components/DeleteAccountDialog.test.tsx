import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({ useDeleteAccount: vi.fn() }));

import { DeleteAccountDialog } from './DeleteAccountDialog';
import { useDeleteAccount } from '../hooks/useAuth';

const mutate = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});

describe('DeleteAccountDialog', () => {
  it('되돌릴 수 없는 삭제 안내와 확인 동작을 표시한다', () => {
    vi.mocked(useDeleteAccount).mockReturnValue({ isPending: false, mutate } as never);
    render(<DeleteAccountDialog />);

    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));
    expect(screen.getByRole('dialog', { name: '회원 탈퇴할까요?' })).toBeInTheDocument();
    expect(screen.getByText('탈퇴하면 되돌릴 수 없어요.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 확인' }));

    expect(mutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('삭제 요청 중에는 확인 버튼을 비활성화한다', () => {
    vi.mocked(useDeleteAccount).mockReturnValue({ isPending: true, mutate } as never);
    render(<DeleteAccountDialog />);

    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));
    expect(screen.getByRole('button', { name: '탈퇴 확인' })).toBeDisabled();
  });
});
