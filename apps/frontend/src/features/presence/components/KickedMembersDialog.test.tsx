import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KickedRoomMember } from '@syfity/shared';

import { KickedMembersDialog } from './KickedMembersDialog';
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
  kickedAt: '2026-07-21T01:00:00.000Z',
  nickname: '지민',
  profileImage: null,
  userId: 'member-1',
} satisfies KickedRoomMember;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

function TestProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

const renderDialog = (onRequestUnkick = vi.fn()) => {
  render(
    <KickedMembersDialog
      onOpenChange={vi.fn()}
      onRequestUnkick={onRequestUnkick}
      open
      roomId="room-1"
    />,
    { wrapper: TestProviders },
  );

  return onRequestUnkick;
};

describe('KickedMembersDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('브랜드 그라데이션의 멤버 제외 아이콘을 표시한다', () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderDialog();

    const dialog = screen.getByRole('dialog');
    const icon = dialog.querySelector('.lucide-user-minus');

    expect(icon).toBeInTheDocument();
    expect(icon?.parentElement).toHaveClass(
      'rounded-full',
      'border-primary/30',
      'bg-none',
      'bg-primary/15',
      'text-primary',
      'shadow-[0_0_16px_rgba(114,244,164,0.25)]',
    );
    expect(icon?.parentElement).not.toHaveClass('to-accent', 'text-black');
  });

  it('아이콘과 제목만 있는 간결한 헤더를 표시한다', () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderDialog();

    expect(screen.getByRole('heading', { name: '추방 관리' })).toBeInTheDocument();
    expect(
      screen.queryByText('추방된 멤버를 확인하고 다시 입장할 수 있게 해제합니다.'),
    ).not.toBeInTheDocument();
  });

  it('추방 목록을 불러오는 동안 loading 상태를 표시한다', () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderDialog();

    expect(screen.getByRole('status')).toHaveTextContent('추방 목록을 불러오는 중이에요.');
  });

  it('추방된 멤버가 없으면 empty 상태를 표시한다', async () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [] });

    renderDialog();

    expect(await screen.findByText('추방된 멤버가 없어요.')).toBeInTheDocument();
  });

  it('추방된 멤버를 표시하고 해제 대상을 전달한다', async () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [member] });
    const onRequestUnkick = renderDialog();
    const kickedAt = new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(member.kickedAt));

    expect(await screen.findByText(kickedAt)).toHaveAttribute('datetime', member.kickedAt);
    const kickedMembersList = screen.getByRole('list', { name: '추방된 멤버 목록' });

    expect(kickedMembersList.querySelector('.opacity-45')).not.toBeInTheDocument();
    expect(kickedMembersList.querySelector('.bg-primary')).not.toBeInTheDocument();
    const unkickButton = screen.getByRole('button', { name: '지민 추방 해제' });
    expect(unkickButton).toHaveClass('min-h-11', 'min-w-11');
    fireEvent.click(unkickButton);

    expect(onRequestUnkick).toHaveBeenCalledWith(member);
  });

  it('추방 시각이 잘못된 경우 안전한 대체 문구를 표시한다', async () => {
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({
      members: [{ ...member, kickedAt: 'invalid-date' }],
    });

    renderDialog();

    expect(await screen.findByText('추방 시간 알 수 없음')).toBeInTheDocument();
  });

  it('조회 실패를 안내하고 다시 시도할 수 있다', async () => {
    vi.mocked(roomMemberApi.getKickedMembers)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ members: [] });

    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent('추방 목록을 불러오지 못했어요.');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('추방된 멤버가 없어요.')).toBeInTheDocument();
    expect(roomMemberApi.getKickedMembers).toHaveBeenCalledTimes(2);
  });
});
