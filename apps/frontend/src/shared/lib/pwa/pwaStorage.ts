const DISMISS_KEY = 'syfity:pwa-install-dismissed-at';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export function recordInstallPromptDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // 프라이빗 모드 등 저장할 수 없는 환경에서는 다음 세션에 다시 안내한다.
  }
}

export function isInstallPromptInCooldown(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;

    const dismissedAt = Number(raw);
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_MS;
  } catch {
    return false;
  }
}
