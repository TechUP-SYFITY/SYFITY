// PlaylistPanel의 주요 상태 렌더링을 API mock 기반으로 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { playlistApi } from './playlistApi';
import { PlaylistPanel } from './PlaylistPanel';
import { usePlaylistStore } from './playlistStore';

vi.mock('./playlistApi', () => ({
  playlistApi: {
    addPlaylistItem: vi.fn(),
    deletePlaylistItem: vi.fn(),
    getPlaylist: vi.fn(),
    reorderPlaylist: vi.fn(),
  },
}));

const roomId = 'room-1';

const availableItem: PlaylistItem = {
  addedBy: 'user-1',
  channelTitle: 'Channel One',
  duration: 180,
  id: 'playlist-item-1',
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://example.com/one.jpg',
  title: 'Song One',
  videoId: 'video-1',
};

const unavailableItem: PlaylistItem = {
  addedBy: 'user-2',
  channelTitle: 'Channel Two',
  duration: 200,
  id: 'playlist-item-2',
  position: 2,
  status: 'unavailable',
  thumbnailUrl: 'https://example.com/two.jpg',
  title: 'Song Two',
  videoId: 'video-2',
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function renderPlaylistPanel(options?: {
  canControlRoom?: boolean;
  currentPlaylistItemId?: string;
  isHost?: boolean;
  playlistItems?: PlaylistItem[];
  queryClient?: QueryClient;
}) {
  const queryClient = options?.queryClient ?? createQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <PlaylistPanel
        canControlRoom={options?.canControlRoom ?? true}
        currentPlaylistItemId={options?.currentPlaylistItemId ?? availableItem.id}
        playlistItems={options?.playlistItems}
        roomId={roomId}
        isHost={options?.isHost ?? true}
        isReady
        onOpenSearch={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

function createPendingPromise<T>() {
  return new Promise<T>(() => undefined);
}

describe('PlaylistPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlaylistStore.getState().clearPlaylist();
  });

  afterEach(() => {
    cleanup();
    usePlaylistStore.getState().clearPlaylist();
  });

  it('API 조회 중이면 최초 로딩 상태를 표시한다', () => {
    vi.mocked(playlistApi.getPlaylist).mockReturnValue(createPendingPromise());

    renderPlaylistPanel();

    expect(screen.getByText('Playlist 불러오는 중')).toBeInTheDocument();
    expect(playlistApi.getPlaylist).toHaveBeenCalledWith(roomId);
  });

  it('API 조회 실패 시 에러 상태와 재시도 버튼을 표시한다', async () => {
    vi.mocked(playlistApi.getPlaylist).mockRejectedValue(new Error('Failed to fetch'));

    renderPlaylistPanel();

    await waitFor(() => {
      expect(screen.getByText('재생목록을 불러오지 못했어요')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(
      screen.getByText('서버에 연결하지 못했어요. 백엔드 실행 상태를 확인해주세요.'),
    ).toBeInTheDocument();
  });

  it('목록이 없으면 빈 상태를 표시한다', () => {
    renderPlaylistPanel({ playlistItems: [] });

    expect(screen.getByText('아직 곡이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '첫 번째 곡 추가' })).toBeInTheDocument();
  });

  it('unavailable 곡은 경고 아이콘과 함께 비활성 스타일로 렌더링한다', () => {
    renderPlaylistPanel({ playlistItems: [availableItem, unavailableItem] });

    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.getByText('Song Two')).toBeInTheDocument();
    expect(getMetaText('Channel One·3:00')).toHaveClass('text-muted-foreground');
    expect(getMetaText('Channel Two·3:20')).toHaveClass('text-muted-foreground/60');
    expect(screen.getByLabelText('Song Two 썸네일')).toHaveClass('opacity-45');
  });

  it('실제 현재 곡 ID와 일치하는 행만 강조한다', () => {
    renderPlaylistPanel({
      currentPlaylistItemId: unavailableItem.id,
      playlistItems: [availableItem, unavailableItem],
    });

    expect(screen.getByTestId(`playlist-row-${availableItem.id}`)).not.toHaveClass('bg-primary/5');
    expect(screen.getByTestId(`playlist-row-${unavailableItem.id}`)).toHaveClass('bg-primary/5');
  });

  it('기존 목록이 있으면 API 요청 중이어도 전체 로딩 스피너를 같이 표시하지 않는다', () => {
    usePlaylistStore.getState().setPlaylist([availableItem]);
    vi.mocked(playlistApi.getPlaylist).mockReturnValue(createPendingPromise());

    renderPlaylistPanel();

    expect(screen.getByText('Song One')).toBeInTheDocument();
    expect(screen.queryByText('Playlist 불러오는 중')).not.toBeInTheDocument();
  });

  it('재조회 성공 시 이전 mutation 오류를 초기화한다', async () => {
    vi.mocked(playlistApi.getPlaylist)
      .mockResolvedValueOnce({ playlist: [availableItem] })
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({ playlist: [availableItem] });
    vi.mocked(playlistApi.deletePlaylistItem).mockRejectedValue(new Error('delete failed'));

    renderPlaylistPanel();

    await screen.findByText('Song One');
    fireEvent.click(screen.getByRole('button', { name: 'Song One 삭제' }));

    await waitFor(() => {
      expect(screen.getByText('delete failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(screen.queryByText('delete failed')).not.toBeInTheDocument();
      expect(screen.queryByText('재생목록을 불러오지 못했어요')).not.toBeInTheDocument();
      expect(screen.getByText('Song One')).toBeInTheDocument();
    });
  });

  it('재조회가 다시 실패하면 이전 mutation 오류를 유지한다', async () => {
    vi.mocked(playlistApi.getPlaylist)
      .mockResolvedValueOnce({ playlist: [availableItem] })
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Retry failed'));
    vi.mocked(playlistApi.deletePlaylistItem).mockRejectedValue(new Error('delete failed'));

    renderPlaylistPanel();

    await screen.findByText('Song One');
    fireEvent.click(screen.getByRole('button', { name: 'Song One 삭제' }));

    await waitFor(() => {
      expect(screen.getByText('delete failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    await waitFor(() => {
      expect(playlistApi.getPlaylist).toHaveBeenCalledTimes(3);
      expect(screen.getByText('delete failed')).toBeInTheDocument();
      expect(screen.getByText('재생목록을 불러오지 못했어요')).toBeInTheDocument();
    });
  });

  it('matches playlist row actions to the Figma desktop and mobile affordances.', () => {
    renderPlaylistPanel({ playlistItems: [availableItem, unavailableItem] });

    const actions = screen.getByTestId(`playlist-actions-${availableItem.id}`);
    expect(actions).toHaveClass('hidden', 'xl:flex', 'xl:opacity-0', 'xl:group-hover:opacity-100');
    expect(screen.queryByTestId(`playlist-play-${availableItem.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`playlist-move-up-${availableItem.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`playlist-move-down-${availableItem.id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`playlist-drag-handle-${availableItem.id}`)).toHaveClass(
      'cursor-grab',
      'bg-transparent',
    );

    fireEvent.focus(screen.getByTestId(`playlist-row-${availableItem.id}`));

    expect(actions).toHaveClass('flex', 'opacity-100');
    expect(screen.getByRole('button', { name: 'Song One 순서 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Song One 삭제' })).toHaveClass(
      'bg-destructive/10',
      'xl:bg-transparent',
      'xl:text-destructive/70',
    );
  });

  it('Host 역할은 유지하지만 제어할 수 없으면 Playlist 조작을 비활성화한다', () => {
    const onOpenSearch = vi.fn();

    render(
      <QueryClientProvider client={createQueryClient()}>
        <PlaylistPanel
          canControlRoom={false}
          currentPlaylistItemId={availableItem.id}
          playlistItems={[availableItem]}
          roomId={roomId}
          isHost
          isReady
          onOpenSearch={onOpenSearch}
        />
      </QueryClientProvider>,
    );

    fireEvent.focus(screen.getByTestId(`playlist-row-${availableItem.id}`));

    expect(screen.getByRole('button', { name: 'Song One 순서 변경' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Song One 삭제' })).toBeDisabled();
    screen
      .getAllByRole('button', { name: /곡 추가|추가/ })
      .forEach((button) => expect(button).toBeDisabled());
  });
});

function getMetaText(text: string) {
  return screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === text);
}
