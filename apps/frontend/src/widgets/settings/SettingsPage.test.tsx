import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/hooks/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/features/auth/components/ProfileImagePicker', () => ({
  ProfileImagePicker: ({ nickname }: { nickname: string }) => <div>profile: {nickname}</div>,
}));
vi.mock('@/features/auth/components/NicknameEditor', () => ({
  NicknameEditor: ({ initialNickname }: { initialNickname: string }) => (
    <div>nickname: {initialNickname}</div>
  ),
}));
vi.mock('@/features/auth/components/DeleteAccountDialog', () => ({
  DeleteAccountDialog: () => <button type="button">mock delete</button>,
}));

import { useMe } from '@/features/auth/hooks/useAuth';

import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('프로필이 아직 없으면 아무 화면도 렌더링하지 않는다', () => {
    vi.mocked(useMe).mockReturnValue({ data: undefined } as never);
    const { container } = render(<SettingsPage />);

    expect(container.firstChild).toBeNull();
  });

  it('현재 계정 정보와 설정 기능을 조합한다', () => {
    vi.mocked(useMe).mockReturnValue({
      data: { email: 'alice@syfity.site', nickname: 'Alice', profileImage: null },
    } as never);
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: '계정' })).toBeInTheDocument();
    expect(screen.getByText('alice@syfity.site')).toBeInTheDocument();
    expect(screen.getByText('profile: Alice')).toBeInTheDocument();
    expect(screen.getByText('nickname: Alice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mock delete' })).toBeInTheDocument();
  });
});
