// 자동 playback 동기화 토스트의 요청과 완료 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/shared/components/ui';

import { PlaybackSyncToast } from './PlaybackSyncToast';
import { usePlayerStore } from '../store/playerStore';

const playbackState = {
  currentTime: 24,
  isPlaying: true,
  playbackVersion: 1,
  playlistItemId: 'playlist-item-1',
  videoId: 'video-1',
};

describe('PlaybackSyncToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

  it('수동 동기화 요청 중에는 Member 재개 문구를 표시한다', () => {
    usePlayerStore.getState().beginPlaybackSync('manual');

    renderPlaybackSyncToast();

    expect(screen.getByText('최신 재생 위치로 동기화하는 중이에요')).toBeInTheDocument();
    expect(
      screen.queryByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).not.toBeInTheDocument();
  });

  it('수동 동기화 실패 시 오류 토스트를 표시하고 닫을 수 있다', () => {
    usePlayerStore.getState().beginPlaybackSync('manual');
    usePlayerStore.getState().setPlaybackSyncError();

    renderPlaybackSyncToast();

    expect(screen.getByText('동기화에 실패했어요. 다시 눌러 시도해주세요')).toBeInTheDocument();
    expect(
      screen.getByText('동기화에 실패했어요. 다시 눌러 시도해주세요').closest('[data-state]'),
    ).toHaveClass('text-destructive');

    fireEvent.click(screen.getByRole('button', { name: '동기화 알림 닫기' }));

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
  });

  it('닫기 버튼으로 피드백 상태를 초기화한다', () => {
    usePlayerStore.getState().beginPlaybackSync();
    usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
    renderPlaybackSyncToast();

    fireEvent.click(screen.getByRole('button', { name: '동기화 알림 닫기' }));

    expect(usePlayerStore.getState().playbackSyncStatus).toBe('idle');
  });

  it('pending 토스트는 4초 후 닫혀도 늦은 동기화 응답을 완료 상태로 전환한다', async () => {
    vi.useFakeTimers();
    usePlayerStore.getState().beginPlaybackSync();
    renderPlaybackSyncToast();

    await act(() => vi.advanceTimersByTimeAsync(4000));

    expect(
      screen.queryByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).not.toBeInTheDocument();
    expect(usePlayerStore.getState().playbackSyncStatus).toBe('pending');

    act(() => {
      usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
    });

    expect(screen.getByText('현재 재생 위치로 동기화됐어요.')).toBeInTheDocument();
  });

  it('완료 토스트는 2초, 오류 토스트는 4초 후 종료한다', async () => {
    vi.useFakeTimers();
    usePlayerStore.getState().beginPlaybackSync();
    renderPlaybackSyncToast();

    act(() => {
      usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
    });
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(screen.queryByText('현재 재생 위치로 동기화됐어요.')).not.toBeInTheDocument();

    act(() => {
      usePlayerStore.getState().beginPlaybackSync('manual');
      usePlayerStore.getState().setPlaybackSyncError();
    });
    await act(() => vi.advanceTimersByTimeAsync(3999));

    expect(screen.getByText('동기화에 실패했어요. 다시 눌러 시도해주세요')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(
      screen.queryByText('동기화에 실패했어요. 다시 눌러 시도해주세요'),
    ).not.toBeInTheDocument();
  });
});

function renderPlaybackSyncToast() {
  return render(
    <ToastProvider>
      <PlaybackSyncToast />
    </ToastProvider>,
  );
}
