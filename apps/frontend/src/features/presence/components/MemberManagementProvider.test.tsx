import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KickedRoomMember, RoomMemberSummary } from '@syfity/shared';

import { ToastProvider } from '@/shared/components/ui';

import { MemberManagementProvider, useMemberManagement } from './MemberManagementProvider';
import { roomMemberApi } from '../api/roomMemberApi';

vi.mock('../api/roomMemberApi', () => ({
  roomMemberApi: {
    getActiveMembers: vi.fn(),
    getKickedMembers: vi.fn(),
    updateMember: vi.fn(),
  },
}));

const activeMember = {
  id: 'membership-1',
  nickname: '지민',
  profileImage: null,
  role: 'member',
  status: 'online',
  userId: 'member-1',
} satisfies RoomMemberSummary;

const kickedMember = {
  id: 'membership-2',
  kickedAt: '2026-07-21T01:00:00.000Z',
  nickname: '수빈',
  profileImage: null,
  userId: 'member-2',
} satisfies KickedRoomMember;

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

function Consumer() {
  const management = useMemberManagement();

  return (
    <div>
      <span>{management.canManage ? '관리 가능' : '관리 불가'}</span>
      <span>{management.activeMembers.map((member) => member.nickname).join(',')}</span>
      <button type="button" onClick={() => management.openKickDialog(activeMember)}>
        추방 확인 열기
      </button>
      <button type="button" onClick={management.openKickedMembersDialog}>
        추방 목록 열기
      </button>
    </div>
  );
}

const renderProvider = (isHost: boolean) =>
  render(
    <MemberManagementProvider currentUserId="host-1" isHost={isHost} roomId="room-1">
      <Consumer />
    </MemberManagementProvider>,
    { wrapper: TestProviders },
  );

describe('MemberManagementProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roomMemberApi.getActiveMembers).mockResolvedValue({ members: [activeMember] });
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [kickedMember] });
  });

  afterEach(cleanup);

  it('Host에게만 관리 상태와 활성 RoomMember 메타데이터를 제공한다', async () => {
    const { unmount } = renderProvider(true);

    expect(screen.getByText('관리 가능')).toBeInTheDocument();
    expect(await screen.findByText('지민')).toBeInTheDocument();
    expect(roomMemberApi.getActiveMembers).toHaveBeenCalledWith('room-1');

    unmount();
    vi.clearAllMocks();
    renderProvider(false);

    expect(screen.getByText('관리 불가')).toBeInTheDocument();
    await waitFor(() => expect(roomMemberApi.getActiveMembers).not.toHaveBeenCalled());
  });

  it('선택한 활성 멤버의 추방 확인 Dialog를 연다', async () => {
    renderProvider(true);

    fireEvent.click(screen.getByRole('button', { name: '추방 확인 열기' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('지민님을 추방할까요?');
  });

  it('추방 목록을 닫은 뒤 해제 확인 Dialog로 전환한다', async () => {
    renderProvider(true);

    fireEvent.click(screen.getByRole('button', { name: '추방 목록 열기' }));
    fireEvent.click(await screen.findByRole('button', { name: '수빈 추방 해제' }));

    const dialogs = await screen.findAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0]).toHaveTextContent('수빈님의 추방을 해제할까요?');
    expect(screen.queryByRole('heading', { name: '추방 관리' })).not.toBeInTheDocument();
  });
});
