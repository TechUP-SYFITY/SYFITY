// YouTube IFrame Player 스텁.
//
// Room 화면은 https://www.youtube.com/iframe_api 스크립트를 주입하고 실제 플레이어를 띄운다.
// E2E에서 검증할 대상은 "소리가 났는가"가 아니라 "Host의 명령이 Socket을 타고 Member UI에
// 반영되는가"이므로, 실제 재생·광고는 자동화 범위에서 제외하고 플레이어를 통째로 대체한다.
//
// 동작 방식:
//   YouTubePlayer.tsx의 loadYouTubeApi()는 `window.YT?.Player`가 이미 있으면 즉시 resolve하고
//   스크립트를 주입하지 않는다. 그래서 페이지 스크립트보다 먼저 window.YT를 심어 두면
//   iframe_api 요청 자체가 발생하지 않는다.
import type { Page } from '@playwright/test';

/** 스텁 플레이어의 현재 상태. 테스트가 window.__e2eYouTube로 읽고 조작한다. */
export interface YouTubePlayerSnapshot {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isDestroyed: boolean;
}

declare global {
  interface Window {
    __e2eYouTube?: {
      snapshot: () => YouTubePlayerSnapshot;
      /** 곡이 끝난 상황을 만든다 (다음 곡 자동 전환 검증용). */
      endVideo: () => void;
      /** 재생 오류를 만든다 (오류 처리 흐름 검증용). */
      raiseError: (errorCode: number) => void;
    };
  }
}

// 이 함수는 브라우저 컨텍스트에서 실행된다. 외부 스코프의 값을 참조할 수 없다.
function installStub() {
  const PlayerState = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };

  interface PlayerEvents {
    onError?: (event: { data: number; target: FakePlayer }) => void;
    onReady?: (event: { target: FakePlayer }) => void;
    onStateChange?: (event: { data: number; target: FakePlayer }) => void;
  }

  interface VideoRequest {
    videoId: string;
    startSeconds?: number;
  }

  // 테스트가 조작할 대상은 항상 마지막에 생성된 플레이어다.
  let activePlayer: FakePlayer | null = null;
  const setActivePlayer = (player: FakePlayer) => {
    activePlayer = player;
  };

  class FakePlayer {
    private videoId: string | null = null;
    private isPlaying = false;
    private position = 0;
    // 재생 중일 때 getCurrentTime()이 흘러가야 동기화 로직이 실제처럼 동작한다.
    private positionUpdatedAt = Date.now();
    private volume = 100;
    private isMuted = false;
    private isDestroyed = false;

    constructor(
      private readonly element: HTMLElement,
      private readonly options: { events?: PlayerEvents },
    ) {
      element.setAttribute('data-e2e-youtube-player', 'ready');
      this.render();
      setActivePlayer(this);

      // 실제 IFrame API도 onReady를 비동기로 호출한다. 동기 호출하면
      // 컴포넌트가 ref를 세팅하기 전에 콜백이 들어와 실제와 다른 순서가 된다.
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.options.events?.onReady?.({ target: this });
        }
      }, 0);
    }

    private render() {
      this.element.setAttribute('data-e2e-video-id', this.videoId ?? '');
      this.element.setAttribute('data-e2e-playing', String(this.isPlaying));
    }

    private settle() {
      this.position = this.getCurrentTime();
      this.positionUpdatedAt = Date.now();
    }

    private emitState(state: number) {
      this.render();
      this.options.events?.onStateChange?.({ data: state, target: this });
    }

    getCurrentTime(): number {
      if (!this.isPlaying) {
        return this.position;
      }

      return this.position + (Date.now() - this.positionUpdatedAt) / 1000;
    }

    loadVideoById(request: VideoRequest) {
      this.videoId = request.videoId;
      this.position = request.startSeconds ?? 0;
      this.positionUpdatedAt = Date.now();
      this.isPlaying = true;
      this.emitState(PlayerState.PLAYING);
    }

    cueVideoById(request: VideoRequest) {
      this.videoId = request.videoId;
      this.position = request.startSeconds ?? 0;
      this.positionUpdatedAt = Date.now();
      this.isPlaying = false;
      this.emitState(PlayerState.CUED);
    }

    playVideo() {
      if (this.isPlaying) {
        return;
      }

      this.positionUpdatedAt = Date.now();
      this.isPlaying = true;
      this.emitState(PlayerState.PLAYING);
    }

    pauseVideo() {
      if (!this.isPlaying) {
        return;
      }

      this.settle();
      this.isPlaying = false;
      this.emitState(PlayerState.PAUSED);
    }

    seekTo(seconds: number) {
      this.position = seconds;
      this.positionUpdatedAt = Date.now();
      this.render();
    }

    setVolume(volume: number) {
      this.volume = volume;
    }

    mute() {
      this.isMuted = true;
    }

    unMute() {
      this.isMuted = false;
    }

    destroy() {
      this.isDestroyed = true;
      this.element.removeAttribute('data-e2e-youtube-player');
    }

    endVideo() {
      this.settle();
      this.isPlaying = false;
      this.emitState(PlayerState.ENDED);
    }

    raiseError(errorCode: number) {
      this.options.events?.onError?.({ data: errorCode, target: this });
    }

    snapshot() {
      return {
        videoId: this.videoId,
        isPlaying: this.isPlaying,
        currentTime: this.getCurrentTime(),
        volume: this.volume,
        isMuted: this.isMuted,
        isDestroyed: this.isDestroyed,
      };
    }
  }

  const requireActivePlayer = () => {
    if (!activePlayer) {
      throw new Error('[e2e] YouTube 플레이어가 아직 생성되지 않았습니다.');
    }

    return activePlayer;
  };

  // window.YT의 실제 타입(@types/youtube)과 형태가 달라 unknown을 거쳐 심는다.
  const globalTarget = window as unknown as Record<string, unknown>;
  globalTarget.YT = { Player: FakePlayer, PlayerState };
  globalTarget.__e2eYouTube = {
    snapshot: () => requireActivePlayer().snapshot(),
    endVideo: () => requireActivePlayer().endVideo(),
    raiseError: (errorCode: number) => requireActivePlayer().raiseError(errorCode),
  };
}

/**
 * 페이지 스크립트보다 먼저 스텁을 심고, 혹시 모를 YouTube 요청을 차단한다.
 *
 * route 차단은 이중 방어다. 스텁이 정상 동작하면 요청 자체가 없지만, 스텁이 깨졌을 때
 * 조용히 실제 YouTube로 나가는 대신 테스트가 실패하도록 만든다.
 */
export async function installYouTubePlayerStub(page: Page) {
  await page.addInitScript(installStub);
  await page.route(/youtube\.com|ytimg\.com|googlevideo\.com/, (route) => route.abort());
}
