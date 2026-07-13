'use client';

// 자동 playback 동기화 요청과 완료 상태를 Figma 토스트로 표시한다.
import { RefreshCw, X } from 'lucide-react';

import {
  Toast,
  ToastClose,
  ToastIcon,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/shared/components/ui';

import { usePlayerStore } from './playerStore';

const PENDING_DURATION_MS = 10_000;
const SYNCED_DURATION_MS = 4_000;

export function PlaybackSyncToast() {
  const syncStatus = usePlayerStore((state) => state.playbackSyncStatus);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const isOpen = syncStatus !== 'idle';
  const message =
    syncStatus === 'synced'
      ? '현재 재생 위치로 동기화됐어요.'
      : '광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다';

  return (
    <ToastProvider swipeDirection="down">
      <Toast
        key={syncStatus}
        className="mx-auto w-full max-w-sm"
        duration={syncStatus === 'pending' ? PENDING_DURATION_MS : SYNCED_DURATION_MS}
        open={isOpen}
        variant="success"
        onOpenChange={(open) => {
          if (!open) {
            clearPlaybackSync();
          }
        }}
      >
        <ToastIcon>
          <RefreshCw aria-hidden />
        </ToastIcon>
        <ToastTitle>{message}</ToastTitle>
        <ToastClose aria-label="동기화 알림 닫기">
          <X aria-hidden />
        </ToastClose>
      </Toast>
      <ToastViewport className="bottom-16 sm:bottom-20" />
    </ToastProvider>
  );
}
