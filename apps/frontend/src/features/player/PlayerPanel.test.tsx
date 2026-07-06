// Player 제어 UI가 Socket 명령 계약에 맞게 동작하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { playbackCommands } from './playbackCommands';
import { PlayerPanel } from './PlayerPanel';
import { usePlayerStore } from './playerStore';

vi.mock('./YouTubePlayer', () => ({
  YouTubePlayer: ({ onEnded }: { onEnded: () => void }) => (
    <button type="button" onClick={onEnded}>
      mock ended
    </button>
  ),
}));

vi.mock('./playbackCommands', () => ({
  playbackCommands: {
    changeTrack: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    reportError: vi.fn(),
    requestSync: vi.fn(),
    seek: vi.fn(),
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
    vi.mocked(playbackCommands.play).mockResolvedValue(undefined);
    vi.mocked(playbackCommands.pause).mockResolvedValue(undefined);
    vi.mocked(playbackCommands.changeTrack).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    usePlayerStore.getState().clearPlayback();
  });

  it('Host가 재생 버튼을 누르면 playback:play 명령을 보낸다', async () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '재생' }));

    await waitFor(() => {
      expect(playbackCommands.play).toHaveBeenCalledWith(roomId, 12);
    });
  });

  it('Host가 일시정지 버튼을 누르면 playback:pause 명령을 보낸다', async () => {
    seedPlayback(true);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));

    await waitFor(() => {
      expect(playbackCommands.pause).toHaveBeenCalledWith(roomId, 12);
    });
  });

  it('Host가 다음 곡 버튼을 누르면 다음 playlistItemId로 곡 변경 명령을 보낸다', async () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '다음 곡' }));

    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-2');
    });
  });

  it('마지막 곡 종료 시 0초 pause 명령으로 재생 상태를 정리한다', async () => {
    seedPlayback(true, 'playlist-item-2');
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock ended' }));

    await waitFor(() => {
      expect(playbackCommands.pause).toHaveBeenCalledWith(roomId, 0);
    });
  });

  it('Member에게는 재생 제어 버튼이 비활성화된다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost={false} playlist={playlist} />);

    expect(screen.getByRole('button', { name: '재생' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 곡' })).toBeDisabled();
    expect(screen.getByText('Host만 재생을 제어할 수 있어요.')).toBeInTheDocument();
  });

  it('동기화 버튼을 누르면 sync request를 보내고 피드백을 표시한다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '동기화' }));

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(screen.getByText('동기화 요청을 보냈어요.')).toBeInTheDocument();
  });

  it('playback:tick 수신만으로는 동기화 피드백을 표시하지 않는다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    act(() => {
      usePlayerStore.getState().setPlaybackState(
        {
          currentTime: 22,
          isPlaying: true,
          playlistItemId: 'playlist-item-1',
          videoId: 'video-1',
        },
        'tick',
      );
    });

    expect(screen.queryByText('서버 기준 재생 위치를 확인했어요.')).not.toBeInTheDocument();
    expect(screen.queryByText('서버 재생 위치와 동기화됐어요.')).not.toBeInTheDocument();
  });

  it('playback:error 상태를 사용자 메시지로 표시한다', () => {
    seedPlayback(false);
    usePlayerStore.getState().setPlaybackError('video-1', 150);

    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    expect(screen.getByText('재생할 수 없는 영상이에요. 오류 코드 150')).toBeInTheDocument();
  });

  it('제어 명령 실패 시 사용자 메시지를 표시한다', async () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.play).mockRejectedValue(
      new Error('AUTH_FORBIDDEN: Host가 아닙니다.'),
    );
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '재생' }));

    await waitFor(() => {
      expect(screen.getByText('Host만 재생을 제어할 수 있어요.')).toBeInTheDocument();
    });
  });

  it('알 수 없는 제어 명령 실패 시 fallback 메시지를 표시한다', async () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.play).mockRejectedValue(new Error('UPSTREAM_UNKNOWN'));
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: '재생' }));

    await waitFor(() => {
      expect(screen.getByText('재생 제어 요청에 실패했어요.')).toBeInTheDocument();
    });
  });
});
