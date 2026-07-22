import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('../hooks/useAuth', () => ({ useCompleteOnboarding: vi.fn(), useMe: vi.fn() }));
vi.mock('./ProfileImagePicker', () => ({
  ProfileImagePicker: ({ nickname }: { nickname: string }) => <div>image picker: {nickname}</div>,
}));

import { OnboardingForm } from './OnboardingForm';
import { useCompleteOnboarding, useMe } from '../hooks/useAuth';

const mutate = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('OnboardingForm', () => {
  it('기본 닉네임과 약관 동의가 있어야 온보딩을 제출할 수 있다', () => {
    vi.mocked(useMe).mockReturnValue({ data: { nickname: 'Alice', profileImage: null } } as never);
    vi.mocked(useCompleteOnboarding).mockReturnValue({ isPending: false, mutate } as never);
    render(<OnboardingForm />);

    expect(screen.getByText('image picker: Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: '시작하기' })).toBeEnabled();
  });

  it('닉네임과 동의를 전달하고 성공하면 홈으로 이동한다', () => {
    vi.mocked(useMe).mockReturnValue({ data: { nickname: 'Alice', profileImage: null } } as never);
    vi.mocked(useCompleteOnboarding).mockReturnValue({ isPending: false, mutate } as never);
    render(<OnboardingForm />);

    fireEvent.change(screen.getByPlaceholderText('닉네임'), { target: { value: 'New name' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));

    expect(mutate).toHaveBeenCalledWith(
      { nickname: 'New name', ageAndTermsAgreed: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const callbacks = vi.mocked(mutate).mock.calls.at(0)?.[1] as
      { onSuccess: () => void } | undefined;
    expect(callbacks).toBeDefined();
    callbacks?.onSuccess();
    expect(replace).toHaveBeenCalledWith('/home');
  });
});
