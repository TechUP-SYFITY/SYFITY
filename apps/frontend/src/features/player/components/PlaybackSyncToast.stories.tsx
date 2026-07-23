// 자동 playback 동기화 토스트의 요청 중·완료 상태를 Storybook에서 검증한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';

import { ToastProvider } from '@/shared/components/ui';
import type { PlaylistItem } from '@/shared/types/domain';

import { MiniPlayer } from './MiniPlayer';
import { PlaybackSyncToast } from './PlaybackSyncToast';
import { usePlayerStore } from '../store/playerStore';
import type { PlaybackSyncStatus } from '../types/playerTypes';

const playbackState = {
  currentTime: 24,
  isPlaying: true,
  playbackVersion: 1,
  playlistItemId: 'story-playlist-item',
  videoId: 'story-video',
};

const currentTrack: PlaylistItem = {
  addedBy: 'story-host',
  channelTitle: 'One Direction',
  duration: 226,
  id: playbackState.playlistItemId,
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
  title: 'Night Changes',
  videoId: playbackState.videoId,
};

const meta = {
  title: 'Features/Player/PlaybackSyncToast',
  component: PlaybackSyncToast,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
      },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider viewportClassName="bottom-28 xl:bottom-20">
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
    useEffect(() => {
      usePlayerStore.getState().clearPlayback();

      if (syncStatus !== 'idle') {
        usePlayerStore.getState().beginPlaybackSync();
      }
      if (syncStatus === 'synced') {
        usePlayerStore.getState().setPlaybackState(playbackState, 'sync-response');
      }
      if (syncStatus === 'error') {
        usePlayerStore.getState().setPlaybackSyncError();
      }

      return () => {
        usePlayerStore.getState().clearPlayback();
      };
    }, []);

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

export const ManualPending: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        usePlayerStore.getState().beginPlaybackSync('manual');

        return () => {
          usePlayerStore.getState().clearPlayback();
        };
      }, []);

      return <Story />;
    },
  ],
};

export const Error: Story = {
  decorators: [withSyncStatus('error')],
};

export const PendingAboveMiniPlayer: Story = {
  decorators: [withSyncStatus('pending')],
  render: () => (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <PlaybackSyncToast />
      <div className="min-h-0 flex-1" />
      <div
        aria-label="모바일 Room 탭 바"
        className="fixed inset-x-0 bottom-16 h-12 border-t border-border bg-background xl:hidden"
      />
      <MiniPlayer
        commandError={null}
        controlDisabled={false}
        currentTrack={currentTrack}
        isHost
        isLocalSyncPaused={false}
        isMuted={false}
        nextDisabled={false}
        onMuteToggle={fn()}
        onNextTrack={fn()}
        onPlayPause={fn()}
        onPreviousTrack={fn()}
        onRepeatToggle={fn()}
        onSeek={fn()}
        onShuffleToggle={fn()}
        onVolumeChange={fn()}
        pendingCommand={null}
        playbackState={playbackState}
        playPauseDisabled={false}
        previousDisabled={false}
        repeatMode="off"
        shuffleEnabled={false}
        volume={70}
      />
    </div>
  ),
};

export const PendingAboveMobileRoomControls: Story = {
  ...PendingAboveMiniPlayer,
  globals: {
    viewport: { value: 'mobile', isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const toastTitle = await page.findByText('광고 또는 버퍼링 후 현재 위치로 자동 동기화됩니다');
    const toast = toastTitle.closest('li');
    const mobileTabs = page.getByLabelText('모바일 Room 탭 바');
    const storyWindow = canvasElement.ownerDocument.defaultView;

    if (!toast || !storyWindow) {
      throw new globalThis.Error('모바일 Toast 배치 검증 요소를 찾을 수 없습니다.');
    }

    await waitFor(() => {
      const toastRect = toast.getBoundingClientRect();
      const tabRect = mobileTabs.getBoundingClientRect();

      expect(toastRect.bottom).toBeLessThanOrEqual(tabRect.top);
      expect(
        Math.abs(toastRect.left + toastRect.width / 2 - storyWindow.innerWidth / 2),
      ).toBeLessThan(1);
    });
  },
};
