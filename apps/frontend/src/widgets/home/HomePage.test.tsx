// Home이 closed Room 복구 feature의 action과 상태만 조합하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

const mocks = vi.hoisted(() => ({
  actionState: {
    errorMessage: undefined as string | undefined,
    errorRoomId: undefined as string | undefined,
    recoveringRoomId: undefined as string | undefined,
  },
  recover: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useMe: () => ({ data: { nickname: 'Alice' }, isLoading: false }),
}));

vi.mock('@/features/room/hooks/roomHooks', () => ({
  useMyRooms: () => ({
    data: {
      rooms: [
        {
          closedAt: '2026-07-20T08:00:00.000Z',
          id: 'closed-room',
          name: '지난 Room',
          status: 'closed',
          updatedAt: '2026-07-20T08:00:00.000Z',
        },
      ],
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useRecentRooms: () => ({ data: { rooms: [] }, isLoading: false }),
}));

vi.mock('@/features/room/hooks/useRecoverRoomAction', () => ({
  useRecoverRoomAction: () => ({
    ...mocks.actionState,
    recover: mocks.recover,
    reset: mocks.reset,
  }),
}));

vi.mock('@/features/room/components/CreateRoomDialog', () => ({
  CreateRoomDialog: () => null,
}));
vi.mock('@/features/room/components/InviteCodeDialog', () => ({
  InviteCodeDialog: () => null,
}));
vi.mock('@/features/room/components/JoinRoomDialog', () => ({
  JoinRoomDialog: () => null,
}));

describe('HomePage Room recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.actionState.errorMessage = undefined;
    mocks.actionState.errorRoomId = undefined;
    mocks.actionState.recoveringRoomId = undefined;
  });

  afterEach(cleanup);

  it('복구 확인 시 feature action을 호출한다', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    fireEvent.click(screen.getByRole('button', { name: 'Room 복구 확인' }));

    expect(mocks.recover).toHaveBeenCalledWith('closed-room');
  });

  it('feature가 반환한 복구 오류를 해당 Dialog에 표시한다', () => {
    mocks.actionState.errorMessage = '이미 복구되었거나 복구할 수 없는 Room이에요.';
    mocks.actionState.errorRoomId = 'closed-room';

    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      '이미 복구되었거나 복구할 수 없는 Room이에요.',
    );
  });

  it('복구 Dialog를 닫으면 feature 오류 상태를 초기화한다', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(mocks.reset).toHaveBeenCalledOnce();
  });
});
