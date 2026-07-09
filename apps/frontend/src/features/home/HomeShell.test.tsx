import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authApi } from '@/features/auth/api/authApi';
import { roomApi } from '@/features/room/roomApi';

import { HomeShell } from './HomeShell';

vi.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    getMe: vi.fn(),
  },
}));

vi.mock('@/features/room/roomApi', () => ({
  roomApi: {
    getRecentRooms: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHomeShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HomeShell />
    </QueryClientProvider>,
  );
}

describe('HomeShell', () => {
  it('로그인한 사용자의 닉네임과 참여한 방 목록을 올바르게 렌더링한다', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 'u1',
      email: 'alice@syfity.com',
      nickname: 'Alice',
      profileImage: null,
    });

    vi.mocked(roomApi.getRecentRooms).mockResolvedValue({
      rooms: [
        {
          id: 'room-1',
          name: '신나는 팝송방',
          inviteCode: 'ABC123',
          lastJoinedAt: new Date().toISOString(),
        },
      ],
    });

    renderHomeShell();

    // 닉네임 렌더링 검증
    expect(await screen.findByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();

    // 방 목록 렌더링 검증
    expect(await screen.findByText('신나는 팝송방')).toBeInTheDocument();
  });

  it('참여한 방이 없을 경우 빈 상태를 표시한다', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({
      id: 'u1',
      email: 'alice@syfity.com',
      nickname: 'Alice',
      profileImage: null,
    });

    vi.mocked(roomApi.getRecentRooms).mockResolvedValue({
      rooms: [],
    });

    renderHomeShell();

    expect(await screen.findByText(/안녕하세요,\s*Alice님\s*👋/)).toBeInTheDocument();
    expect(await screen.findByText('아직 참여한 방이 없어요')).toBeInTheDocument();
  });
});
