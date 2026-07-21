import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';

import { KickedMembersButton } from './KickedMembersButton';
import { MemberManagementProvider } from './MemberManagementProvider';
import { roomMemberApi } from '../api/roomMemberApi';

vi.mock('../api/roomMemberApi', () => ({
  roomMemberApi: {
    getActiveMembers: vi.fn(),
    getKickedMembers: vi.fn(),
    updateMember: vi.fn(),
  },
}));

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function TestProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}

const renderButton = (isHost: boolean) =>
  render(
    <MemberManagementProvider currentUserId="host-1" isHost={isHost} roomId="room-1">
      <KickedMembersButton />
    </MemberManagementProvider>,
    { wrapper: TestProviders },
  );

describe('KickedMembersButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roomMemberApi.getActiveMembers).mockResolvedValue({ members: [] });
    vi.mocked(roomMemberApi.getKickedMembers).mockResolvedValue({ members: [] });
  });

  afterEach(cleanup);

  it('Host가 버튼을 눌러 추방 관리 Dialog를 연다', async () => {
    renderButton(true);
    const button = screen.getByRole('button', { name: '추방 관리' });

    expect(button).toHaveClass('size-11');
    fireEvent.click(button);

    expect(await screen.findByRole('dialog')).toHaveTextContent('추방 관리');
  });

  it('Host가 아니면 버튼을 표시하지 않는다', () => {
    renderButton(false);

    expect(screen.queryByRole('button', { name: '추방 관리' })).not.toBeInTheDocument();
  });
});
