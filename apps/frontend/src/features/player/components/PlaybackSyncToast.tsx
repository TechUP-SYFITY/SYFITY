'use client';

// 자동 playback 동기화 요청과 완료 상태를 Figma 토스트로 표시한다.
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { useToast } from '@/shared/components/ui';

import { usePlayerStore } from '../store/playerStore';

const PENDING_DURATION_MS = 4_000;
const SYNCED_DURATION_MS = 2_000;
const ERROR_DURATION_MS = 4_000;
const PLAYBACK_SYNC_TOAST_ID = 'playback-sync';

export function PlaybackSyncToast() {
  const syncStatus = usePlayerStore((state) => state.playbackSyncStatus);
  const syncSource = usePlayerStore((state) => state.playbackSyncSource);
  const clearPlaybackSync = usePlayerStore((state) => state.clearPlaybackSync);
  const { dismissToast, pushToast } = useToast();

  useEffect(() => {
    let title: string;
    let duration: number;
    let icon: ReactNode;
    let variant: 'error' | 'success';

    switch (syncStatus) {
      case 'idle':
        dismissToast(PLAYBACK_SYNC_TOAST_ID);
        return;
      case 'pending':
        title =
          syncSource === 'manual'
            ? '최신 재생 위치로 동기화하는 중이에요'
            : '광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다';
        duration = PENDING_DURATION_MS;
        icon = <RefreshCw aria-hidden />;
        variant = 'success';
        break;
      case 'synced':
        title = '현재 재생 위치로 동기화됐어요.';
        duration = SYNCED_DURATION_MS;
        icon = <RefreshCw aria-hidden />;
        variant = 'success';
        break;
      case 'error':
        title = '동기화에 실패했어요. 다시 눌러 시도해주세요';
        duration = ERROR_DURATION_MS;
        icon = <AlertTriangle aria-hidden />;
        variant = 'error';
        break;
      default: {
        const exhaustiveStatus: never = syncStatus;
        return exhaustiveStatus;
      }
    }

    pushToast({
      id: PLAYBACK_SYNC_TOAST_ID,
      title,
      icon,
      duration,
      closeLabel: '동기화 알림 닫기',
      onDismiss: syncStatus === 'pending' ? undefined : clearPlaybackSync,
      variant,
    });
  }, [clearPlaybackSync, dismissToast, pushToast, syncSource, syncStatus]);

  useEffect(
    () => () => {
      dismissToast(PLAYBACK_SYNC_TOAST_ID);
    },
    [dismissToast],
  );

  return null;
}
