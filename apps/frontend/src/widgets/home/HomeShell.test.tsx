import '@testing-library/jest-dom/vitest';

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { previewRecentRooms } from './homePreviewData';
import { HomeShell } from './HomeShell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

const noop = () => {};

describe('HomeShell', () => {
  it('닉네임과 참여한 방 목록을 렌더링한다', () => {
    render(
      <HomeShell
        nickname="Alice"
        isUserLoading={false}
        rooms={previewRecentRooms}
        isRoomsLoading={false}
        onCreateRoom={noop}
        onJoinRoom={noop}
      />,
    );

    expect(screen.getByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();
    expect(screen.getByText(previewRecentRooms[0].name)).toBeInTheDocument();
  });

  it('참여한 방이 없을 경우 빈 상태를 표시한다', () => {
    render(
      <HomeShell
        nickname="Alice"
        isUserLoading={false}
        rooms={[]}
        isRoomsLoading={false}
        onCreateRoom={noop}
        onJoinRoom={noop}
      />,
    );

    expect(screen.getByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();
    expect(screen.getByText('아직 참여한 방이 없어요')).toBeInTheDocument();
  });
});
