// 자동 playback 동기화 토스트의 요청 중·완료 상태를 Storybook에서 검증한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { expect, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';

import { PlaybackSyncToast } from './PlaybackSyncToast';
import { usePlayerStore } from './playerStore';
import type { PlaybackSyncStatus } from './playerTypes';

const playbackState = {
  currentTime: 24,
  isPlaying: true,
  playlistItemId: 'story-playlist-item',
  videoId: 'story-video',
};

const meta = {
  title: 'Features/Player/PlaybackSyncToast',
  component: PlaybackSyncToast,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <ToastProvider viewportClassName="bottom-16 sm:bottom-20">
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof PlaybackSyncToast>;

export default meta;
type Story = StoryObj<typeof meta>;
type StoryRender = () => ReactNode;

function withSyncStatus(syncStatus: PlaybackSyncStatus) {
  return function SyncStatusDecorator(Story: StoryRender) {
    usePlayerStore.getState().clearPlayback();

    if (syncStatus !== 'idle') {
      usePlayerStore.getState().beginPlaybackSync();
    }
    if (syncStatus === 'synced') {
      usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
    }

    return <Story />;
  };
}

export const Pending: Story = {
  decorators: [withSyncStatus('pending')],
  play: async () => {
    const page = within(document.body);

    await expect(
      page.findByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다'),
    ).resolves.toBeInTheDocument();
  },
};

export const Synced: Story = {
  decorators: [withSyncStatus('synced')],
  play: async () => {
    const page = within(document.body);

    await expect(page.findByText('현재 재생 위치로 동기화됐어요.')).resolves.toBeInTheDocument();
  },
};
