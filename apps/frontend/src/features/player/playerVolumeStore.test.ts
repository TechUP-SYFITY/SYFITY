// Player 로컬 볼륨 store가 음소거와 볼륨 복구 규칙을 지키는지 검증한다.
import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerVolumeStore } from './playerVolumeStore';

describe('usePlayerVolumeStore', () => {
  beforeEach(() => {
    usePlayerVolumeStore.setState({
      isMuted: false,
      previousVolume: 70,
      volume: 70,
    });
  });

  it('볼륨 변경 값을 0에서 100 사이 정수로 제한한다', () => {
    usePlayerVolumeStore.getState().setVolume(120.4);

    expect(usePlayerVolumeStore.getState().volume).toBe(100);

    usePlayerVolumeStore.getState().setVolume(-10);

    expect(usePlayerVolumeStore.getState().volume).toBe(0);
  });

  it('볼륨을 0으로 낮추면 음소거 상태가 된다', () => {
    usePlayerVolumeStore.getState().setVolume(0);

    expect(usePlayerVolumeStore.getState()).toMatchObject({
      isMuted: true,
      previousVolume: 70,
      volume: 0,
    });
  });

  it('음소거 해제 시 이전 볼륨을 복구한다', () => {
    usePlayerVolumeStore.getState().setVolume(35);
    usePlayerVolumeStore.getState().toggleMuted();
    usePlayerVolumeStore.getState().setVolume(0);
    usePlayerVolumeStore.getState().toggleMuted();

    expect(usePlayerVolumeStore.getState()).toMatchObject({
      isMuted: false,
      volume: 35,
    });
  });

  it('음소거 중 양수 볼륨을 선택하면 음소거가 해제된다', () => {
    usePlayerVolumeStore.getState().toggleMuted();
    usePlayerVolumeStore.getState().setVolume(42);

    expect(usePlayerVolumeStore.getState()).toMatchObject({
      isMuted: false,
      previousVolume: 42,
      volume: 42,
    });
  });
});
