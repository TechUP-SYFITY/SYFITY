// MiniPlayer가 주입된 재생, 진행률, 로컬 볼륨 상태를 UI에 반영하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaybackState, PlaylistItem } from '@/shared/types/domain';

import { MiniPlayer } from './MiniPlayer';

const track: PlaylistItem = {
  addedBy: 'user-1',
  channelTitle: 'Channel One',
  duration: 180,
  id: 'playlist-item-1',
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  title: 'Song One',
  videoId: 'video-1',
};

const playbackState: PlaybackState = {
  currentTime: 45,
  isPlaying: false,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

function renderMiniPlayer(props: Partial<ComponentProps<typeof MiniPlayer>> = {}) {
  const defaultProps: ComponentProps<typeof MiniPlayer> = {
    commandError: null,
    controlDisabled: false,
    currentTrack: track,
    isHost: true,
    isMuted: false,
    nextDisabled: false,
    onMiniPlayerMuteToggle: vi.fn(),
    onNextTrack: vi.fn(),
    onPlayPause: vi.fn(),
    onPreviousTrack: vi.fn(),
    onVolumeChange: vi.fn(),
    pendingCommand: null,
    playbackState,
    previousDisabled: false,
    volume: 70,
  };

  return render(<MiniPlayer {...defaultProps} {...props} />);
}

describe('MiniPlayer', () => {
  afterEach(() => {
    cleanup();
  });

  it('playbackState와 곡 길이 기준으로 현재 시간과 진행률을 표시한다', () => {
    renderMiniPlayer();

    expect(screen.getByText('0:45')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
    expect(screen.getByTestId('mini-player-progress-thumb')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '재생 진행률' })).toHaveAttribute(
      'aria-valuenow',
      '45',
    );
  });

  it('진행 시간이 0초이면 시간 텍스트와 겹치지 않도록 progress thumb를 숨긴다', () => {
    renderMiniPlayer({
      playbackState: {
        ...playbackState,
        currentTime: 0,
      },
    });

    expect(screen.queryByTestId('mini-player-progress-thumb')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '재생 진행률' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  it('Host가 재생, 이전 곡, 다음 곡 버튼을 누르면 주입된 핸들러를 호출한다', () => {
    const onNextTrack = vi.fn();
    const onPlayPause = vi.fn();
    const onPreviousTrack = vi.fn();

    renderMiniPlayer({
      onNextTrack,
      onPlayPause,
      onPreviousTrack,
    });

    fireEvent.click(screen.getByRole('button', { name: '재생' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 곡' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 곡' }));

    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onPreviousTrack).toHaveBeenCalledTimes(1);
    expect(onNextTrack).toHaveBeenCalledTimes(1);
  });

  it('Member이거나 곡 이동 대상이 없으면 제어 버튼을 비활성화한다', () => {
    renderMiniPlayer({
      controlDisabled: true,
      isHost: false,
      nextDisabled: true,
      previousDisabled: true,
    });

    expect(screen.getByRole('button', { name: '재생' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이전 곡' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 곡' })).toBeDisabled();
    expect(screen.getByText('Host만 재생을 제어할 수 있어요')).toBeInTheDocument();
  });

  it('제어 명령 실패 메시지를 MiniPlayer 위에 표시한다', () => {
    renderMiniPlayer({ commandError: '서버에 연결하지 못했어요.' });

    expect(screen.getByText('서버에 연결하지 못했어요.')).toBeInTheDocument();
  });

  it('볼륨 슬라이더 변경 값을 주입된 핸들러로 전달한다', () => {
    const onVolumeChange = vi.fn();

    renderMiniPlayer({ onVolumeChange, volume: 70 });

    fireEvent.change(screen.getByRole('slider', { name: '볼륨 조절' }), {
      target: { value: '35' },
    });

    expect(onVolumeChange).toHaveBeenCalledWith(35);
  });

  it('음소거 버튼을 누르면 주입된 핸들러를 호출한다', () => {
    const onMiniPlayerMuteToggle = vi.fn();

    renderMiniPlayer({ onMiniPlayerMuteToggle });

    fireEvent.click(screen.getByRole('button', { name: '음소거' }));

    expect(onMiniPlayerMuteToggle).toHaveBeenCalledTimes(1);
  });

  it('음소거 상태에서는 슬라이더 값을 0으로 표시한다', () => {
    renderMiniPlayer({ isMuted: true, volume: 70 });

    expect(screen.getByRole('button', { name: '음소거 해제' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: '볼륨 조절' })).toHaveValue('0');
  });
});
