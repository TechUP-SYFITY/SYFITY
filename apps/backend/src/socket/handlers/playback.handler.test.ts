import type { Server, Socket } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';

import { registerPlaybackHandlers } from './playback.handler';

const state = {
  videoId: 'video-1',
  playlistItemId: 'item-1',
  currentTime: 0,
  isPlaying: true,
  playbackVersion: 1,
};

function setup() {
  const handlers: Record<string, (...args: unknown[]) => Promise<void>> = {};
  const socket = {
    data: { userId: 'host' },
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
  } as unknown as Socket;
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server;
  const playbackService = {
    play: vi.fn(),
    pause: vi.fn(),
    seek: vi.fn(),
    selectTrack: vi
      .fn()
      .mockResolvedValue({ payload: state, broadcastEvent: 'playback:change-track' }),
    nextTrack: vi
      .fn()
      .mockResolvedValue({ payload: state, broadcastEvent: 'playback:change-track' }),
    previousTrack: vi
      .fn()
      .mockResolvedValue({ payload: state, broadcastEvent: 'playback:change-track' }),
    updateSettings: vi
      .fn()
      .mockResolvedValue({ repeatMode: 'all', shuffleEnabled: true, playbackVersion: 2 }),
    reportEnded: vi.fn().mockResolvedValue(null),
    reportError: vi.fn(),
    getPlaybackStateForSocket: vi.fn(),
  };
  registerPlaybackHandlers(io, socket, { playbackService });
  return { handlers, emit, playbackService };
}

describe('playback socket handlers', () => {
  it('next와 previous를 playlistItemId 없이 서버에 위임한다', async () => {
    const { handlers, playbackService } = setup();
    const ack = vi.fn();
    await handlers['playback:change-track']({ roomId: 'room-1', action: 'next' }, ack);
    expect(playbackService.nextTrack).toHaveBeenCalledWith('room-1', 'host');
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('설정 변경을 Room에 broadcast한다', async () => {
    const { handlers, emit } = setup();
    await handlers['playback:update-settings']({ roomId: 'room-1', repeatMode: 'all' }, vi.fn());
    expect(emit).toHaveBeenCalledWith(
      'playback:settings',
      expect.objectContaining({ repeatMode: 'all' }),
    );
  });
});
