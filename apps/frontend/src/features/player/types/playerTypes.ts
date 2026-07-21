// Player 기능에서 Socket 제어와 동기화 상태가 공유하는 타입을 정의한다.
import type { PlaybackState } from '@/shared/types/domain';

export type PlaybackEventSource =
  'play' | 'pause' | 'seek' | 'change-track' | 'tick' | 'sync-response' | 'room-join' | 'reset';

export type PlaybackSyncStatus = 'idle' | 'pending' | 'synced' | 'error';

export type PlaybackSyncSource = 'auto' | 'manual';

export type PlayerController = {
  pause(): void;
  play(): void;
};

export interface PlaybackCommandResult {
  success: true;
}

export interface PlaybackCorrection {
  shouldCorrect: boolean;
  driftSeconds: number;
  targetTime: number;
}

export type PlayerPlaybackState = PlaybackState;
