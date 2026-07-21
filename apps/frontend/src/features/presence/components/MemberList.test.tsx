import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoomMemberSummary } from '@syfity/shared';

import { ToastProvider } from '@/shared/components/ui';

import { MemberList } from './MemberList';
import { MemberManagementProvider } from './MemberManagementProvider';
import { roomMemberApi } from '../api/roomMemberApi';
import type { PresenceMember } from '../types/presence';

vi.mock('../api/roomMemberApi', () => ({
  roomMemberApi: {
    getActiveMembers: vi.fn(),
    getKickedMembers: vi.fn(),
    updateMember: vi.fn(),
  },
}));

const members = [
  {
    nickname: 'Host',
    profileImage: null,
    role: 'host',
    status: 'online',
    userId: 'host-1',
  },
  {
    nickname: '지민',
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: 'member-1',
  },
] satisfies PresenceMember[];

const activeMembers = [
  {
    id: 'host-membership',
    ...members[0],
  },
  {
    id: 'member-membership',
    ...members[1],
  },
] satisfies RoomMemberSummary[];

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

const renderList = (isHost: boolean) =>
  render(
    <MemberManagementProvider currentUserId="host-1" isHost={isHost} roomId="room-1">
      <MemberList members={members} />
    </MemberManagementProvider>,
    { wrapper: TestProviders },
  );

describe('MemberList management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roomMemberApi.getActiveMembers).mockResolvedValue({ members: activeMembers });
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [] });
  });

  afterEach(cleanup);

  it('Host에게 다른 멤버의 관리 메뉴만 제공한다', async () => {
    renderList(true);

    expect(await screen.findByRole('button', { name: '지민 멤버 관리' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Host 멤버 관리' })).not.toBeInTheDocument();
  });

  it('Host가 아니면 멤버 관리 메뉴를 제공하지 않는다', () => {
    renderList(false);

    expect(screen.queryByRole('button', { name: '지민 멤버 관리' })).not.toBeInTheDocument();
    expect(roomMemberApi.getActiveMembers).not.toHaveBeenCalled();
  });

  it('관리 메타데이터 조회에 실패해도 기존 멤버 목록을 유지한다', async () => {
    vi.mocked(roomMemberApi.getActiveMembers).mockRejectedValue(new Error('network'));

    renderList(true);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '멤버 관리 정보를 불러오지 못했어요.',
    );
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('지민')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '멤버 관리 정보를 불러오지 못했어요' }),
    ).toBeDisabled();
  });

  it('관리 메타데이터를 불러오는 동안 대상 행을 비활성 관리 버튼으로 유지한다', () => {
    vi.mocked(roomMemberApi.getActiveMembers).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderList(true);

    expect(
      screen.getByRole('button', { name: '멤버 관리 정보를 불러오는 중이에요' }),
    ).toBeDisabled();
    expect(screen.getByText('지민')).toBeInTheDocument();
  });
});
