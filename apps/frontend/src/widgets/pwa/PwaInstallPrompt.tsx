'use client';

import { Download, Share2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/components/ui';
import {
  isInstallPromptInCooldown,
  recordInstallPromptDismissed,
} from '@/shared/lib/pwa/pwaStorage';
import { isIOSSafari, isStandaloneDisplayMode } from '@/shared/lib/pwa/serviceWorker';

import { usePwaStore } from './pwaStore';

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const deferredPrompt = usePwaStore((state) => state.deferredPrompt);
  const isInstalled = usePwaStore((state) => state.isInstalled);
  const setDeferredPrompt = usePwaStore((state) => state.setDeferredPrompt);
  const [isDismissed, setIsDismissed] = useState(false);

  const isRoomPath = pathname.startsWith('/room/');
  const supportsNativeInstall = deferredPrompt !== null;
  const shouldShow =
    !isRoomPath &&
    !isInstalled &&
    !isDismissed &&
    !isStandaloneDisplayMode() &&
    !isInstallPromptInCooldown() &&
    (supportsNativeInstall || isIOSSafari());

  if (!shouldShow) return null;

  const dismiss = () => {
    recordInstallPromptDismissed();
    setIsDismissed(true);
  };

  const install = () => {
    if (!deferredPrompt) return;

    void (async () => {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // 이미 소비된 설치 프롬프트 등 브라우저 측 거부는 배너를 닫는 것으로 충분하다.
      } finally {
        setDeferredPrompt(null);
      }
    })();
  };

  return (
    <section
      aria-label="Syfity 설치 안내"
      className="fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-xl p-3 sm:p-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/9 bg-surface/80 p-3 shadow-xl backdrop-blur">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {supportsNativeInstall ? (
            <Download className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          ) : (
            <Share2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          )}
          <p className="text-sm leading-5 text-white/85">
            {supportsNativeInstall
              ? 'Syfity를 설치하고 더 빠르게 접속하세요'
              : "홈 화면에 추가: 공유 아이콘 → '홈 화면에 추가'를 눌러주세요"}
          </p>
        </div>
        {supportsNativeInstall ? (
          <Button size="sm" onClick={install}>
            설치
          </Button>
        ) : null}
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="설치 안내 닫기"
          onClick={dismiss}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
