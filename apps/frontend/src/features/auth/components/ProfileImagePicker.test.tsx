import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useResetProfileImage: vi.fn(),
  useUploadProfileImage: vi.fn(),
}));

import { ProfileImagePicker } from './ProfileImagePicker';
import { useResetProfileImage, useUploadProfileImage } from '../hooks/useAuth';

const uploadMutate = vi.fn();
const uploadReset = vi.fn();
const resetMutate = vi.fn();

function mockMutations() {
  vi.mocked(useUploadProfileImage).mockReturnValue({
    error: null,
    isPending: false,
    mutate: uploadMutate,
    reset: uploadReset,
  } as never);
  vi.mocked(useResetProfileImage).mockReturnValue({
    isPending: false,
    mutate: resetMutate,
  } as never);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProfileImagePicker', () => {
  it('현재 이미지가 없으면 닉네임 첫 글자를 아바타 대체값으로 표시한다', () => {
    mockMutations();
    render(<ProfileImagePicker currentImage={null} nickname="alice" />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기본 이미지로 변경' })).toBeDisabled();
  });

  it('유효한 이미지 파일을 업로드 mutation으로 전달하고 현재 이미지는 초기화할 수 있다', () => {
    mockMutations();
    render(<ProfileImagePicker currentImage="https://example.com/profile.png" nickname="Alice" />);
    const file = new File(['image'], 'profile.png', { type: 'image/png' });
    const input = screen.getByLabelText('이미지 선택');

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '기본 이미지로 변경' }));

    expect(uploadMutate).toHaveBeenCalledWith(file);
    expect(resetMutate).toHaveBeenCalledOnce();
  });

  it('업로드 중 및 서버 업로드 오류 상태를 표시한다', () => {
    vi.mocked(useUploadProfileImage).mockReturnValue({
      error: new Error('업로드에 실패했어요.'),
      isPending: true,
      mutate: uploadMutate,
      reset: uploadReset,
    } as never);
    vi.mocked(useResetProfileImage).mockReturnValue({
      isPending: false,
      mutate: resetMutate,
    } as never);
    render(<ProfileImagePicker currentImage={null} nickname="Alice" />);

    expect(screen.getByText('업로드 중이에요')).toBeInTheDocument();
    expect(screen.getByText('업로드에 실패했어요.')).toBeInTheDocument();
  });
});
