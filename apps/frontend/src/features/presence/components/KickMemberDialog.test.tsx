import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoomMemberSummary } from '@syfity/shared';

import { ToastProvider } from '@/shared/components/ui';
import { ApiClientError } from '@/shared/types/api';

import { KickMemberDialog } from './KickMemberDialog';
import { roomMemberApi } from '../api/roomMemberApi';

vi.mock('../api/roomMemberApi', () => ({
  roomMemberApi: {
    getActiveMembers: vi.fn(),
    getKickedMembers: vi.fn(),
    updateMember: vi.fn(),
  },
}));

const member = {
  id: 'membership-1',
  nickname: '지민',
  profileImage: null,
  role: 'member',
  status: 'online',
  userId: 'member-1',
} satisfies RoomMemberSummary;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

const renderDialog = (onOpenChange = vi.fn()) => {
  render(<KickMemberDialog member={member} onOpenChange={onOpenChange} open roomId="room-1" />, {
    wrapper: TestProviders,
  });

  return onOpenChange;
};

describe('KickMemberDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('브랜드 그라데이션의 멤버 제외 아이콘을 표시한다', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog');
    const icon = dialog.querySelector('.lucide-user-minus');

    expect(icon).toBeInTheDocument();
    expect(icon?.parentElement).toHaveClass('from-primary', 'to-accent', 'text-black');
  });

  it('취소와 추방 버튼을 같은 너비로 배치한다', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: '취소' })).toHaveClass('sm:flex-1');
    expect(screen.getByRole('button', { name: '추방하기' })).toHaveClass('sm:flex-1');
  });

  it('확인 후 멤버를 추방하고 성공 안내를 표시한다', async () => {
    vi.mocked(roomMemberApi.updateMember).mockResolvedValue({
      memberId: member.id,
      status: 'kicked',
    });
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '추방하기' }));

    await waitFor(() =>
      expect(roomMemberApi.updateMember).toHaveBeenCalledWith('room-1', member.id, {
        status: 'kicked',
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(await screen.findByText('지민님을 추방했어요.')).toBeInTheDocument();
  });

  it('추방 실패 시 Dialog 안에서 오류를 안내한다', async () => {
    vi.mocked(roomMemberApi.updateMember).mockRejectedValue(
      new ApiClientError({ code: 'AUTH_FORBIDDEN', message: 'forbidden' }, 403),
    );
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '추방하기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없어요.');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('추방 요청 중에는 중복 제출과 Dialog 닫기를 막는다', async () => {
    vi.mocked(roomMemberApi.updateMember).mockImplementation(() => new Promise(() => undefined));
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '추방하기' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '추방하기' })).toBeDisabled());
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
