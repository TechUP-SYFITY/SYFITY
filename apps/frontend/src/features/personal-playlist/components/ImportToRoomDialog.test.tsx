// 불러오기 다이얼로그의 선택 가능 조건과 결과 안내를 검증한다.
import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';

import { ImportToRoomDialog } from './ImportToRoomDialog';
import { personalPlaylistApi } from '../api/personalPlaylistApi';
import type { PersonalPlaylistSummary } from '../types/personalPlaylistTypes';

vi.mock('../api/personalPlaylistApi', () => ({
  personalPlaylistApi: {
    getPlaylists: vi.fn(),
    importToRoom: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
  },
}));

const roomId = 'room-1';

const summary = (id: string, name: string): PersonalPlaylistSummary => ({
  createdAt: '2026-07-18T10:00:00.000Z',
  id,
  name,
  updatedAt: '2026-07-20T12:00:00.000Z',
});

function renderDialog(playlists: PersonalPlaylistSummary[]) {
  vi.mocked(personalPlaylistApi.getPlaylists).mockResolvedValue({ playlists });

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <ImportToRoomDialog open onOpenChange={vi.fn()} roomId={roomId} />
      </QueryClientProvider>
    </ToastProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ImportToRoomDialog', () => {
  it('플레이리스트를 선택하기 전에는 "끝에 추가"가 비활성이다', async () => {
    renderDialog([summary('pl-1', '밤 드라이브')]);

    await screen.findByRole('button', { name: /밤 드라이브/ });

    expect(screen.getByRole('button', { name: /끝에 추가/ })).toBeDisabled();
    expect(personalPlaylistApi.importToRoom).not.toHaveBeenCalled();
  });

  it('플레이리스트를 선택하면 "끝에 추가"가 활성화된다', async () => {
    renderDialog([summary('pl-1', '밤 드라이브')]);

    fireEvent.click(await screen.findByRole('button', { name: /밤 드라이브/ }));

    expect(screen.getByRole('button', { name: /끝에 추가/ })).toBeEnabled();
  });

  it('곡이 있는 플레이리스트를 선택하면 personalPlaylistId로 불러오기를 요청한다', async () => {
    vi.mocked(personalPlaylistApi.importToRoom).mockResolvedValue({
      addedCount: 2,
      duplicateCount: 1,
      unavailableCount: 0,
    });
    renderDialog([summary('pl-1', '밤 드라이브')]);

    fireEvent.click(await screen.findByRole('button', { name: /밤 드라이브/ }));
    fireEvent.click(screen.getByRole('button', { name: /끝에 추가/ }));

    await waitFor(() => {
      expect(personalPlaylistApi.importToRoom).toHaveBeenCalledWith(roomId, {
        personalPlaylistId: 'pl-1',
      });
    });
    expect(await screen.findByText('2곡 추가 · 중복 1 건너뜀')).toBeInTheDocument();
  });

  it('추가된 곡이 0이면 "추가할 새 곡이 없어요"로 안내한다', async () => {
    vi.mocked(personalPlaylistApi.importToRoom).mockResolvedValue({
      addedCount: 0,
      duplicateCount: 3,
      unavailableCount: 1,
    });
    renderDialog([summary('pl-1', '밤 드라이브')]);

    fireEvent.click(await screen.findByRole('button', { name: /밤 드라이브/ }));
    fireEvent.click(screen.getByRole('button', { name: /끝에 추가/ }));

    expect(
      await screen.findByText('추가할 새 곡이 없어요 (중복 3 · 재생불가 1)'),
    ).toBeInTheDocument();
  });
});
