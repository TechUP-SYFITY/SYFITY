import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect } from 'react';

import type { BeforeInstallPromptEvent } from '@/shared/lib/pwa/serviceWorker';

import { PwaInstallPrompt } from './PwaInstallPrompt';
import { usePwaStore } from './pwaStore';

const promptEvent = {
  prompt: async () => {},
  userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
} as BeforeInstallPromptEvent;

const meta = {
  title: 'Widgets/PwaInstallPrompt',
  component: PwaInstallPrompt,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PwaInstallPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

function PromptStory({ ios }: { ios: boolean }) {
  useEffect(() => {
    const originalUserAgent = navigator.userAgent;
    if (ios) {
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',
      });
    }

    usePwaStore.setState({
      deferredPrompt: ios ? null : promptEvent,
      isInstalled: false,
      updateAvailable: false,
    });

    return () => {
      if (ios) {
        Object.defineProperty(navigator, 'userAgent', {
          configurable: true,
          value: originalUserAgent,
        });
      }
      usePwaStore.setState({ deferredPrompt: null });
    };
  }, [ios]);

  return <PwaInstallPrompt />;
}

export const AndroidInstallAvailable: Story = {
  render: () => <PromptStory ios={false} />,
};

export const IosInstructions: Story = {
  render: () => <PromptStory ios />,
};
