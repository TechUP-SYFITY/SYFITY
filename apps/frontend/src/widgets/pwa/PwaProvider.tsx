'use client';

import { useEffect } from 'react';

import {
  registerServiceWorker,
  type BeforeInstallPromptEvent,
} from '@/shared/lib/pwa/serviceWorker';

import { PwaInstallPrompt } from './PwaInstallPrompt';
import { usePwaStore } from './pwaStore';
import { PwaUpdateNotice } from './PwaUpdateNotice';

export function PwaProvider() {
  const setDeferredPrompt = usePwaStore((state) => state.setDeferredPrompt);
  const setInstalled = usePwaStore((state) => state.setInstalled);
  const setUpdateAvailable = usePwaStore((state) => state.setUpdateAvailable);

  useEffect(() => {
    registerServiceWorker(() => setUpdateAvailable(true));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setDeferredPrompt, setInstalled, setUpdateAvailable]);

  return (
    <>
      <PwaInstallPrompt />
      <PwaUpdateNotice />
    </>
  );
}
