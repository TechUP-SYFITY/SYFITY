const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isServiceWorkerRegistrationEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

export function registerServiceWorker(onUpdateAvailable: () => void): void {
  if (!isServiceWorkerRegistrationEnabled()) return;

  void navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdateAvailable();
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            onUpdateAvailable();
          }
        });
      });

      window.setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
    })
    .catch((error: unknown) => {
      // eslint-disable-next-line no-console -- 등록 실패 원인을 알 수 있는 유일한 경로
      console.error('[serviceWorker] 등록 실패', error);
    });

  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });
}

export function applyServiceWorkerUpdate(): void {
  void navigator.serviceWorker.getRegistration().then((registration) => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIOS && isSafari;
}
