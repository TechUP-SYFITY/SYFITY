// 라이브러리 화면의 로딩/에러/빈/목록 4가지 상태 분기를 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { personalPlaylistApi } from '@/features/personal-playlist/api/personalPlaylistApi';
import type { PersonalPlaylistSummary } from '@/features/personal-playlist/types/personalPlaylistTypes';

import { PersonalPlaylistLibrary } from './PersonalPlaylistLibrary';

vi.mock('@/features/personal-playlist/api/personalPlaylistApi', () => ({
  personalPlaylistApi: {
    getPlaylists: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
  },
}));

const summary = (id: string, name: string, itemCount: number): PersonalPlaylistSummary => ({
  coverUrl: null,
  description: null,
  id,
  itemCount,
  name,
  totalDuration: itemCount * 200,
  updatedAt: '2026-07-20T12:00:00.000Z',
});

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PersonalPlaylistLibrary />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PersonalPlaylistLibrary', () => {
  it('로딩 중에는 스켈레톤을 보여준다', () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockReturnValue(new Promise(() => undefined));

    const { container } = renderLibrary();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('아직 플레이리스트가 없어요')).not.toBeInTheDocument();
  });

  it('조회 실패 시 에러 상태와 재시도 버튼을 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockRejectedValue(new Error('boom'));

    renderLibrary();

    expect(await screen.findByText('플레이리스트를 불러오지 못했어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('재시도를 누르면 다시 조회한다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockRejectedValue(new Error('boom'));

    renderLibrary();
    const retry = await screen.findByRole('button', { name: '다시 시도' });

    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({
      playlists: [summary('pl-1', '밤 드라이브', 4)],
    });
    fireEvent.click(retry);

    expect(await screen.findByText('밤 드라이브')).toBeInTheDocument();
  });

  it('목록이 비면 빈 상태와 생성 CTA를 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({ playlists: [] });

    renderLibrary();

    expect(await screen.findByText('아직 플레이리스트가 없어요')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /새 플레이리스트/ }).length).toBeGreaterThan(0);
  });

  it('빈 상태에서는 개수 pill을 숨긴다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({ playlists: [] });

    renderLibrary();
    await screen.findByText('아직 플레이리스트가 없어요');

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('목록이 있으면 카드와 개수 pill을 보여준다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({
      playlists: [summary('pl-1', '밤 드라이브', 4), summary('pl-2', '집중 로파이', 2)],
    });

    renderLibrary();

    expect(await screen.findByText('밤 드라이브')).toBeInTheDocument();
    expect(screen.getByText('집중 로파이')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('아직 플레이리스트가 없어요')).not.toBeInTheDocument();
  });

  it('카드는 상세 경로로 링크된다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({
      playlists: [summary('pl-1', '밤 드라이브', 4)],
    });

    renderLibrary();

    const link = await screen.findByRole('link', { name: /밤 드라이브/ });
    expect(link).toHaveAttribute('href', '/playlists/pl-1');
  });

  it('"새 플레이리스트"를 누르면 생성 다이얼로그가 열린다', async () => {
    vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({
      playlists: [summary('pl-1', '밤 드라이브', 4)],
    });

    renderLibrary();
    await screen.findByText('밤 드라이브');

    fireEvent.click(screen.getByRole('button', { name: /새 플레이리스트/ }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
