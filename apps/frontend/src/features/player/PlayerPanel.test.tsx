// PlayerPanel이 Figma 기준 표시 UI와 자동 playback 이벤트를 유지하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistItem } from '@/shared/types/domain';

import { playbackCommands } from './playbackCommands';
import { PlayerPanel } from './PlayerPanel';
import { usePlayerStore } from './playerStore';

vi.mock('./YouTubePlayer', () => ({
  YouTubePlayer: ({
    onBufferingRecovered,
    onEnded,
    onError,
  }: {
    onBufferingRecovered: () => void;
    onEnded: () => void;
    onError: (errorCode: number) => void;
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
    </div>
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

  it('현재 재생 곡 정보와 Figma 기준 표시 UI를 렌더링한다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    expect(screen.getByRole('heading', { name: 'Song One' })).toBeInTheDocument();
    expect(screen.getByText('Channel One')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '재생' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 곡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '동기화' })).not.toBeInTheDocument();
    expect(screen.queryByText('Host 제어 가능')).not.toBeInTheDocument();
  });

  it('Host에서 영상 종료 시 다음 playlistItemId로 곡 변경 명령을 보낸다', async () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock ended' }));

    await waitFor(() => {
      expect(playbackCommands.changeTrack).toHaveBeenCalledWith(roomId, 'playlist-item-2');
    });
  });

  it('Member에서 영상 종료 시 곡 변경 명령을 보내지 않는다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost={false} playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock ended' }));

    expect(playbackCommands.changeTrack).not.toHaveBeenCalled();
    expect(playbackCommands.pause).not.toHaveBeenCalled();
  });

  it('마지막 곡 종료 시 0초 pause 명령으로 재생 상태를 정리한다', async () => {
    seedPlayback(true, 'playlist-item-2');
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock ended' }));

    await waitFor(() => {
      expect(playbackCommands.pause).toHaveBeenCalledWith(roomId, 0);
    });
  });

  it('버퍼링 회복 시 자동 동기화 요청을 보낸다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock buffering recovered' }));

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
  });

  it('Socket 미연결 상태의 버퍼링 회복은 표시 UI를 깨뜨리지 않는다', () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.requestSync).mockImplementation(() => {
      throw new Error('Socket is not connected.');
    });
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock buffering recovered' }));

    expect(playbackCommands.requestSync).toHaveBeenCalledWith(roomId);
    expect(screen.getByRole('heading', { name: 'Song One' })).toBeInTheDocument();
  });

  it('playback:error 상태를 사용자 메시지로 표시한다', () => {
    seedPlayback(false);
    usePlayerStore.getState().setPlaybackError('video-1', 150);

    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    expect(screen.getByText('재생할 수 없는 영상이에요. 오류 코드 150')).toBeInTheDocument();
  });

  it('Host에서 player error 발생 시 서버에 재생 실패를 보고한다', async () => {
    seedPlayback(false);
    vi.mocked(playbackCommands.reportError).mockResolvedValue(undefined);
    render(<PlayerPanel roomId={roomId} isHost playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock player error' }));

    await waitFor(() => {
      expect(playbackCommands.reportError).toHaveBeenCalledWith(roomId, 'video-1', 150);
    });
  });

  it('Member에서 player error 발생 시 서버에 재생 실패를 보고하지 않는다', () => {
    seedPlayback(false);
    render(<PlayerPanel roomId={roomId} isHost={false} playlist={playlist} />);

    fireEvent.click(screen.getByRole('button', { name: 'mock player error' }));

    expect(playbackCommands.reportError).not.toHaveBeenCalled();
  });
});
