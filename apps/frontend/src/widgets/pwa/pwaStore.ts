import { create } from 'zustand';

import type { BeforeInstallPromptEvent } from '@/shared/lib/pwa/serviceWorker';

interface PwaState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  updateAvailable: boolean;
  setDeferredPrompt: (event: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
  setUpdateAvailable: (available: boolean) => void;
}

export const usePwaStore = create<PwaState>((set) => ({
  deferredPrompt: null,
  isInstalled: false,
  updateAvailable: false,
  setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
  setInstalled: (isInstalled) => set({ isInstalled }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
}));
