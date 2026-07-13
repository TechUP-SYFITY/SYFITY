// 자동 playback 동기화 토스트의 요청과 완료 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';

import { PlaybackSyncToast } from './PlaybackSyncToast';
import { usePlayerStore } from './playerStore';

const playbackState = {
  currentTime: 24,
  isPlaying: true,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

describe('PlaybackSyncToast', () => {
  afterEach(() => {
    cleanup();
    usePlayerStore.getState().clearPlayback();
  });

  it('idle 상태에서는 동기화 토스트를 표시하지 않는다', () => {
    renderPlaybackSyncToast();

    expect(
      screen.queryByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('현재 재생 위치로 동기화됐어요.')).not.toBeInTheDocument();
  });

  it('자동 동기화 요청 중 Figma 안내 문구를 표시한다', () => {
    usePlayerStore.getState().beginPlaybackSync();

    renderPlaybackSyncToast();

    expect(
      screen.getByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).toBeInTheDocument();
  });

  it('요청 후 sync-response를 수신하면 완료 문구를 표시한다', () => {
    usePlayerStore.getState().beginPlaybackSync();
    renderPlaybackSyncToast();

    act(() => {
      usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
    });

    expect(screen.getByText('현재 재생 위치로 동기화됐어요.')).toBeInTheDocument();
  });

  it('닫기 버튼으로 피드백 상태를 초기화한다', () => {
    usePlayerStore.getState().beginPlaybackSync();
    renderPlaybackSyncToast();

    fireEvent.click(screen.getByRole('button', { name: '동기화 알림 닫기' }));

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
  });
});

function renderPlaybackSyncToast() {
  return render(
    <ToastProvider>
      <PlaybackSyncToast />
    </ToastProvider>,
  );
}
