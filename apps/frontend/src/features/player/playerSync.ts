// 서버가 전달한 재생 위치와 로컬 Player 위치의 보정 여부를 계산한다.
import type { PlaybackCorrection, PlayerPlaybackState } from './playerTypes';

export const SYNC_CHECK_INTERVAL_MS = 10_000;
export const SYNC_THRESHOLD_SECONDS = 2;

export const getPlaybackDriftSeconds = (playerTime: number, serverTime: number) =>
  Math.abs(playerTime - serverTime);

export const getPlaybackCorrection = (
  playerTime: number,
  playbackState: PlayerPlaybackState,
  thresholdSeconds = SYNC_THRESHOLD_SECONDS,
): PlaybackCorrection => {
  const driftSeconds = getPlaybackDriftSeconds(playerTime, playbackState.currentTime);

  return {
    driftSeconds,
    shouldCorrect: driftSeconds >= thresholdSeconds,
    targetTime: playbackState.currentTime,
  };
};
