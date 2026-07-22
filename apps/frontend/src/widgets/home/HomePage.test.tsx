// Home의 closed Room 복구 성공 이동과 오류 안내 조합을 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '@/shared/types/api';

import { HomePage } from './HomePage';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  pushToast: vi.fn(),
  recoveryState: {
    error: null as unknown,
    isError: false,
    isPending: false,
    variables: undefined as string | undefined,
  },
  reset: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/shared/components/ui/Toast', () => ({
  useToast: () => ({ pushToast: mocks.pushToast }),
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
  useRecoverRoom: () => ({
    ...mocks.recoveryState,
    mutate: mocks.mutate,
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
    mocks.recoveryState.error = null;
    mocks.recoveryState.isError = false;
    mocks.recoveryState.isPending = false;
    mocks.recoveryState.variables = undefined;
  });

  afterEach(cleanup);

  it('복구 성공 후 안내하고 기존 Room 경로로 이동한다', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    fireEvent.click(screen.getByRole('button', { name: 'Room 복구 확인' }));

    expect(mocks.mutate).toHaveBeenCalledWith('closed-room', expect.any(Object));
    const options = mocks.mutate.mock.calls[0][1] as { onSuccess: () => void };
    options.onSuccess();

    expect(mocks.pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Room을 복구했어요.', variant: 'success' }),
    );
    expect(mocks.routerPush).toHaveBeenCalledWith('/room/closed-room');
  });

  it('복구 기간 만료 오류를 Toast로 안내한다', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));
    fireEvent.click(screen.getByRole('button', { name: 'Room 복구 확인' }));

    const options = mocks.mutate.mock.calls[0][1] as { onError: (error: unknown) => void };
    options.onError(
      new ApiClientError(
        { code: 'ROOM_RECOVERY_EXPIRED', message: 'Room recovery period expired' },
        409,
      ),
    );

    expect(mocks.pushToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '더 이상 사용할 수 없는 Room이에요.', variant: 'error' }),
    );
  });

  it.each([
    ['AUTH_FORBIDDEN', '이 작업을 할 권한이 없어요.'],
    ['ROOM_NOT_CLOSED', '이미 복구되었거나 복구할 수 없는 Room이에요.'],
  ])('%s 복구 오류를 확인 Dialog에 표시한다', (code, message) => {
    mocks.recoveryState.error = new ApiClientError({ code, message: 'Recovery failed' }, 409);
    mocks.recoveryState.isError = true;
    mocks.recoveryState.variables = 'closed-room';

    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: '지난 Room 복구' }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });
});
