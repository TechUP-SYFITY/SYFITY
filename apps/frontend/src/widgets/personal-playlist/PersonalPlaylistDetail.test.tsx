// 상세 화면의 상태 분기와 곡 삭제·정렬·플레이리스트 삭제 흐름을 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { personalPlaylistApi } from '@/features/personal-playlist/api/personalPlaylistApi';
import type { PersonalPlaylistDetail as DetailType } from '@/features/personal-playlist/types/personalPlaylistTypes';

import { PersonalPlaylistDetail } from './PersonalPlaylistDetail';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/features/personal-playlist/api/personalPlaylistApi', () => ({
  personalPlaylistApi: {
    getPlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    deleteItem: vi.fn(),
    reorder: vi.fn(),
    addItem: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
  },
}));

const playlistId = 'pl-1';

const item = (id: string, title: string, position: number): PlaylistItem => ({
  addedBy: 'user-1',
  channelTitle: 'Channel',
  duration: 200,
  id,
  position,
  status: 'available',
  thumbnailUrl: `https://example.com/${id}.jpg`,
  title,
  videoId: `video-${id}`,
});

const detail = (items: PlaylistItem[]): DetailType => ({
  playlist: {
    coverUrl: null,
    description: null,
    id: playlistId,
    itemCount: items.length,
    name: '밤 드라이브',
    totalDuration: items.reduce((sum, entry) => sum + entry.duration, 0),
    updatedAt: '2026-07-20T12:00:00.000Z',
  },
  items,
});

const firstItem = item('item-1', 'Night Changes', 1);
const secondItem = item('item-2', 'Instant Crush', 2);

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PersonalPlaylistDetail playlistId={playlistId} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PersonalPlaylistDetail', () => {
  it('로딩 중에는 스켈레톤을 보여준다', () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockReturnValue(new Promise(() => undefined));

    const { container } = renderDetail();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('조회 실패 시 안내와 목록 복귀 버튼을 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockRejectedValue(new Error('boom'));

    renderDetail();

    expect(await screen.findByText('플레이리스트를 불러오지 못했어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(push).toHaveBeenCalledWith('/playlists');
  });

  it('헤더에 이름과 곡 수·총 재생시간을 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem, secondItem]));

    renderDetail();

    expect(await screen.findByRole('heading', { name: '밤 드라이브' })).toBeInTheDocument();
    expect(screen.getByText(/2곡/)).toHaveTextContent('6분');
  });

  it('곡이 없으면 점선 "곡 추가" 행을 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([]));

    renderDetail();

    expect(
      await screen.findByText('검색하거나 YouTube 링크로 첫 곡을 추가해보세요'),
    ).toBeInTheDocument();
  });

  it('곡이 있으면 목록을 렌더링한다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem, secondItem]));

    renderDetail();

    expect(await screen.findByText('Night Changes')).toBeInTheDocument();
    expect(screen.getByText('Instant Crush')).toBeInTheDocument();
  });

  it('곡 삭제 버튼이 deleteItem을 호출한다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem, secondItem]));
    vi.mocked(personalPlaylistApi.deleteItem).mockResolvedValue(undefined);

    renderDetail();
    await screen.findByText('Night Changes');

    fireEvent.click(screen.getByRole('button', { name: 'Night Changes 삭제' }));

    await waitFor(() => {
      expect(personalPlaylistApi.deleteItem).toHaveBeenCalledWith(playlistId, firstItem.id);
    });
  });

  it('키보드 정렬은 docs/05 규칙대로 0부터 연속된 position을 보낸다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem, secondItem]));
    vi.mocked(personalPlaylistApi.reorder).mockResolvedValue({ items: [] });

    renderDetail();
    await screen.findByText('Night Changes');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Night Changes 순서 변경' }), {
      key: 'ArrowDown',
    });

    await waitFor(() => {
      expect(personalPlaylistApi.reorder).toHaveBeenCalledWith(playlistId, {
        items: [
          { id: secondItem.id, position: 0 },
          { id: firstItem.id, position: 1 },
        ],
      });
    });
  });

  it('삭제 확인 후 플레이리스트를 지우고 목록으로 이동한다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem]));
    vi.mocked(personalPlaylistApi.deletePlaylist).mockResolvedValue(undefined);

    renderDetail();
    await screen.findByText('Night Changes');

    fireEvent.click(screen.getByRole('button', { name: '플레이리스트 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(personalPlaylistApi.deletePlaylist).toHaveBeenCalledWith(playlistId);
    });
    expect(push).toHaveBeenCalledWith('/playlists');
  });

  it('뒤로가기 링크는 목록으로 이동한다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylist).mockResolvedValue(detail([firstItem]));

    renderDetail();
    await screen.findByText('Night Changes');

    fireEvent.click(screen.getByRole('button', { name: '내 플레이리스트' }));

    expect(push).toHaveBeenCalledWith('/playlists');
  });
});
