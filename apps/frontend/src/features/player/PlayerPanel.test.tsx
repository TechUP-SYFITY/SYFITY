// PlayerPanel이 Figma 기준 표시 UI와 자동 playback 이벤트를 유지하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';
import type { PlaylistItem } from '@/shared/types/domain';

import { playbackCommands } from './playbackCommands';
import { PlayerPanel } from './PlayerPanel';
import { usePlayerStore } from './playerStore';

vi.mock('./YouTubePlayer', () => ({
  YouTubePlayer: ({
    onBufferingRecovered,
    onEnded,
    onError,
    onPlaybackStateChange,
  }: {
    onBufferingRecovered: () => void;
    onEnded: () => void;
    onError: (errorCode: number) => void;
    onPlaybackStateChange: (isPlaying: boolean, currentTime: number) => void;
  }) => (
    <div>
      <button type="button" onClick={onEnded}>
        mock ended
      </button>
      <button type="button" onClick={onBufferingRecovered}>
        mock buffering recovered
      </button>
      <button type="button" onClick={() => onError(150)}>
        mock player error
      </button>
      <button type="button" onClick={() => onPlaybackStateChange(false, 42)}>
        mock local pause
      </button>
      <button type="button" onClick={() => onPlaybackStateChange(true, 42)}>
        mock local play
      </button>
    </div>
  ),
}));

vi.mock('./playbackCommands', () => ({
  playbackCommands: {
    reportError: vi.fn(),
    requestSync: vi.fn(),
  },
}));

const roomId = 'room-1';

const playlist: PlaylistItem[] = [
  {
    addedBy: 'user-1',
    channelTitle: 'Channel One',
    duration: 180,
    id: 'playlist-item-1',
    position: 1,
    status: 'available',
    thumbnailUrl: 'https://example.com/one.jpg',
    title: 'Song One',
    videoId: 'video-1',
  },
  {
    addedBy: 'user-2',
    channelTitle: 'Channel Two',
    duration: 200,
    id: 'playlist-item-2',
    position: 2,
    status: 'available',
    thumbnailUrl: 'https://example.com/two.jpg',
    title: 'Song Two',
    videoId: 'video-2',
  },
];

const onEnded = vi.fn();
const onPlaybackStateChange = vi.fn();

function renderPlayerPanel(isHost = true, playlistItems = playlist, canControlRoom = isHost) {
  return render(
    <ToastProvider>
      <PlayerPanel
        canControlRoom={canControlRoom}
        roomId={roomId}
        isHost={isHost}
        onEnded={onEnded}
        onPlaybackStateChange={onPlaybackStateChange}
        playlist={playlistItems}
      />
    </ToastProvider>,
  );
}

function seedPlayback(isPlaying = false, playlistItemId = 'playlist-item-1') {
  usePlayerStore.getState().setPlaybackState(
    {
      currentTime: 12,
      isPlaying,
      playlistItemId,
      videoId: 'video-1',
    },
    'room-join',
  );
}

describe('PlayerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePlayerStore.getState().clearPlayback();
  });

  afterEach(() => {
    cleanup();
    usePlayerStore.getState().clearPlayback();
  });

  it('현재 재생 곡 정보와 Figma 기준 표시 UI를 렌더링한다', () => {
    seedPlayback(false);
    renderPlayerPanel();

    expect(screen.getByRole('heading', { name: 'Song One' })).toBeInTheDocument();
    expect(screen.getByText('Channel One')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '재생' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 곡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '동기화' })).not.toBeInTheDocument();
    expect(screen.queryByText('Host 제어 가능')).not.toBeInTheDocument();
  });

  it('영상 종료 이벤트를 공통 Player 제어 handler로 전달한다', () => {
    seedPlayback(false);
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock ended' }));

    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('버퍼링 회복 시 자동 동기화 요청을 보낸다', () => {
    seedPlayback(false);
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock buffering recovered' }));

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(usePlayerStore.getState().playbackSyncStatus).toBe('pending');
    expect(
      screen.getByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).toBeInTheDocument();
  });

  it('IFrame 일시정지 이벤트를 공통 Player 제어 handler로 전달한다', () => {
    seedPlayback(true);
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock local pause' }));

    expect(onPlaybackStateChange).toHaveBeenCalledWith(false, 42);
  });

  it('IFrame 재생 이벤트를 공통 Player 제어 handler로 전달한다', () => {
    seedPlayback(false);
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock local play' }));

    expect(onPlaybackStateChange).toHaveBeenCalledWith(true, 42);
  });

  it('Socket 미연결 상태의 버퍼링 회복은 표시 UI를 깨뜨리지 않는다', () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.requestSync).mockImplementation(() => {
      throw new Error('Socket is not connected.');
    });
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock buffering recovered' }));

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
    expect(
      screen.queryByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Song One' })).toBeInTheDocument();
  });

  it('playback:error 상태를 사용자 메시지로 표시한다', () => {
    seedPlayback(false);
    usePlayerStore.getState().setPlaybackError('video-1', 150);

    renderPlayerPanel();

    expect(screen.getByText('재생할 수 없는 영상이에요. 오류 코드 150')).toBeInTheDocument();
  });

  it('Host에서 player error 발생 시 서버에 재생 실패를 보고한다', async () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.reportError).mockResolvedValue(undefined);
    renderPlayerPanel();

    fireEvent.click(screen.getByRole('button', { name: 'mock player error' }));

    await waitFor(() => {
      expect(playbackCommands.reportError).toHaveBeenCalledWith(roomId, 'video-1', 150);
    });
  });

  it('Member에서 player error 발생 시 서버에 재생 실패를 보고하지 않는다', () => {
    seedPlayback(false);
    renderPlayerPanel(false);

    fireEvent.click(screen.getByRole('button', { name: 'mock player error' }));

    expect(playbackCommands.reportError).not.toHaveBeenCalled();
  });

  it('Host 역할은 유지하지만 제어할 수 없으면 배지 없이 재생 실패 보고를 차단한다', () => {
    seedPlayback(false);
    renderPlayerPanel(true, playlist, false);

    fireEvent.click(screen.getByRole('button', { name: 'mock player error' }));

    expect(screen.queryByText('호스트 제어')).not.toBeInTheDocument();
    expect(playbackCommands.reportError).not.toHaveBeenCalled();
  });
});
