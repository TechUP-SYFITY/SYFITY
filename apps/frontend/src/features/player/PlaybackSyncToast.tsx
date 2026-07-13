'use client';

// 자동 playback 동기화 요청과 완료 상태를 Figma 토스트로 표시한다.
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { useToast } from '@/shared/components/ui';

import { usePlayerStore } from './playerStore';

const PENDING_DURATION_MS = 10_000;
const SYNCED_DURATION_MS = 4_000;
const PLAYBACK_SYNC_TOAST_ID = 'playback-sync';

export function PlaybackSyncToast() {
  const syncStatus = usePlayerStore((state) => state.playbackSyncStatus);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const { dismissToast, pushToast } = useToast();
  const message =
    syncStatus === 'synced'
      ? '현재 재생 위치로 동기화됐어요.'
      : '광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다';

  useEffect(() => {
    if (syncStatus === 'idle') {
      dismissToast(PLAYBACK_SYNC_TOAST_ID);
      return;
    }

    pushToast({
      id: PLAYBACK_SYNC_TOAST_ID,
      title: message,
      icon: <RefreshCw aria-hidden />,
      duration: syncStatus === 'pending' ? PENDING_DURATION_MS : SYNCED_DURATION_MS,
      closeLabel: '동기화 알림 닫기',
      onDismiss: clearPlaybackSync,
      variant: 'success',
    });
  }, [clearPlaybackSync, dismissToast, message, pushToast, syncStatus]);

  useEffect(
    () => () => {
      dismissToast(PLAYBACK_SYNC_TOAST_ID);
    },
    [dismissToast],
  );

  return null;
}
