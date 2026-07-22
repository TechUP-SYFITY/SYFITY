import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { previewRecentRooms } from './homePreviewData';
import { HomeShell } from './HomeShell';

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const noop = () => {};
const previewMyRooms = [
  {
    closedAt: null,
    id: 'active-room',
    name: '내 활성 Room',
    status: 'active' as const,
    updatedAt: '2026-07-21T08:00:00.000Z',
  },
  {
    closedAt: '2026-07-20T08:00:00.000Z',
    id: 'closed-room',
    name: '내 종료 Room',
    status: 'closed' as const,
    updatedAt: '2026-07-20T08:00:00.000Z',
  },
];

const defaultProps = {
  isMyRoomsError: false,
  isMyRoomsLoading: false,
  isRecentRoomsLoading: false,
  isUserLoading: false,
  myRooms: previewMyRooms,
  nickname: 'Alice',
  onCreateRoom: noop,
  onJoinRoom: noop,
  onRecoverRoom: noop,
  onRecoveryOpenChange: noop,
  onRetryMyRooms: noop,
  recentRooms: previewRecentRooms,
};

describe('HomeShell', () => {
  it('닉네임과 참여한 방 목록을 렌더링한다', () => {
    render(<HomeShell {...defaultProps} />);

    expect(screen.getByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();
    expect(screen.getByText(previewRecentRooms[0].name)).toBeInTheDocument();
    expect(screen.getByText('내 Room')).toBeInTheDocument();
    expect(screen.getByText('내 활성 Room')).toBeInTheDocument();
    expect(screen.getByText('내 종료 Room')).toBeInTheDocument();
    expect(screen.getByText('활성')).toBeInTheDocument();
    expect(screen.getByText('종료됨')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '내 활성 Room 입장' }));
    expect(routerPush).toHaveBeenCalledWith('/room/active-room');
  });

  it('참여한 방이 없을 경우 빈 상태를 표시한다', () => {
    render(<HomeShell {...defaultProps} myRooms={[]} recentRooms={[]} />);

    expect(screen.getByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();
    expect(screen.getByText('아직 참여한 방이 없어요')).toBeInTheDocument();
    expect(screen.getByText('만든 Room이 없어요')).toBeInTheDocument();
  });

  it('내 Room 조회 실패 시 다시 시도 동작을 제공한다', () => {
    const onRetryMyRooms = vi.fn();

    render(
      <HomeShell {...defaultProps} isMyRoomsError myRooms={[]} onRetryMyRooms={onRetryMyRooms} />,
    );

    expect(screen.getByText('내 Room을 불러오지 못했어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetryMyRooms).toHaveBeenCalledTimes(1);
  });

  it('캐시된 내 Room이 있으면 재조회 실패에도 목록을 유지한다', () => {
    render(<HomeShell {...defaultProps} isMyRoomsError />);

    expect(screen.getByText('내 활성 Room')).toBeInTheDocument();
    expect(screen.queryByText('내 Room을 불러오지 못했어요')).not.toBeInTheDocument();
  });

  it('종료 시각이 없는 closed Room은 종료 시각 없음으로 표시한다', () => {
    render(
      <HomeShell
        {...defaultProps}
        myRooms={[
          {
            closedAt: null,
            id: 'closed-room-without-timestamp',
            name: '종료 시각 없는 Room',
            status: 'closed',
            updatedAt: '2026-07-20T08:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('종료 시각 없음')).toBeInTheDocument();
  });

  it('closed Room 복구 확인 후 해당 Room id를 전달한다', () => {
    const onRecoverRoom = vi.fn();
    render(<HomeShell {...defaultProps} onRecoverRoom={onRecoverRoom} />);

    fireEvent.click(screen.getByRole('button', { name: '내 종료 Room 복구' }));
    fireEvent.click(screen.getByRole('button', { name: 'Room 복구 확인' }));

    expect(onRecoverRoom).toHaveBeenCalledWith('closed-room');
    expect(screen.queryByRole('button', { name: '내 활성 Room 복구' })).toBeNull();
  });
});
