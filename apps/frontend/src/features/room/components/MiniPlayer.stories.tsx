// 미니 플레이어의 Host, Member, 비활성, 명령 실패 상태를 Storybook에서 확인한다.
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { PlaybackState, PlaylistItem } from '@/shared/types/domain';

import { MiniPlayer } from './MiniPlayer';

const track: PlaylistItem = {
  addedBy: 'story-host',
  channelTitle: 'One Direction',
  duration: 226,
  id: 'story-night-changes',
  position: 1,
  status: 'available',
  thumbnailUrl: 'https://i.ytimg.com/vi/syFZfO_wfMQ/hqdefault.jpg',
  title: 'Night Changes',
  videoId: 'syFZfO_wfMQ',
};

const playbackState: PlaybackState = {
  currentTime: 64,
  isPlaying: false,
  playlistItemId: track.id,
  videoId: track.videoId,
};

const meta = {
  title: 'Features/Player/MiniPlayer',
  component: MiniPlayer,
  parameters: { layout: 'fullscreen' },
  args: {
    commandError: null,
    controlDisabled: false,
    currentTrack: track,
    isHost: true,
    isMuted: false,
    nextDisabled: false,
    onMuteToggle: fn(),
    onNextTrack: fn(),
    onPlayPause: fn(),
    onPreviousTrack: fn(),
    onSeek: fn(),
    onVolumeChange: fn(),
    pendingCommand: null,
    playbackState,
    previousDisabled: false,
    volume: 70,
  },
} satisfies Meta<typeof MiniPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostPaused: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '재생' }));
    await expect(args.onPlayPause).toHaveBeenCalledOnce();
  },
};

export const HostPlaying: Story = {
  args: {
    playbackState: { ...playbackState, isPlaying: true },
  },
};

export const MemberView: Story = {
  args: {
    controlDisabled: true,
    isHost: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('button', { name: '재생' })).toBeDisabled();
  },
};

export const NoTrack: Story = {
  args: {
    controlDisabled: true,
    currentTrack: undefined,
    nextDisabled: true,
    playbackState: null,
    previousDisabled: true,
  },
};

export const PendingPlay: Story = {
  args: { pendingCommand: 'play' },
};

export const CommandFailure: Story = {
  args: { commandError: '서버에 연결하지 못했어요.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('서버에 연결하지 못했어요.')).toBeInTheDocument();
  },
};
