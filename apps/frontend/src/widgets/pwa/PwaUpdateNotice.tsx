'use client';

import { RefreshCw, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/components/ui';
import { applyServiceWorkerUpdate } from '@/shared/lib/pwa/serviceWorker';

import { usePwaStore } from './pwaStore';

export function PwaUpdateNotice() {
  const pathname = usePathname();
  const updateAvailable = usePwaStore((state) => state.updateAvailable);
  const [dismissedPathname, setDismissedPathname] = useState<string | null>(null);
  const isDismissed = dismissedPathname === pathname;

  if (!updateAvailable || isDismissed) return null;

  return (
    <section
      aria-label="새 버전 안내"
      className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-xl p-3 sm:p-4"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/9 bg-surface/80 p-3 shadow-xl backdrop-blur">
        <RefreshCw className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm leading-5 text-white/85">새 버전이 있어요</p>
        <Button size="sm" onClick={applyServiceWorkerUpdate}>
          새로고침
        </Button>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="새 버전 안내 닫기"
          onClick={() => setDismissedPathname(pathname)}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
