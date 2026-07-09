import { afterEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage, PlaybackState } from '@/shared/types/domain';

import { fakeSocketClient } from './fakeSocketClient';

describe('fakeSocketClient', () => {
  afterEach(() => {
    fakeSocketClient.disconnect();
  });

  it('emits connect after connecting', async () => {
    const socket = fakeSocketClient.connect();
    const listener = vi.fn<() => void>();

    socket.on('connect', listener);
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('acks room join with fixture playback state', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck<{ playbackState: PlaybackState }>) => void>();

    socket.emit('room:join', { roomId: roomFixture.room.id }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: { playbackState: roomFixture.playbackState },
    });
  });

  it('acks playback play and emits updated playback state', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck) => void>();
    const listener = vi.fn<(payload: PlaybackState) => void>();

    socket.on('playback:play', listener);
    socket.emit('playback:play', { currentTime: 10, roomId: roomFixture.room.id }, ack);

    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTime: 10,
        isPlaying: true,
      }),
    );
  });

  it('fails playback change-track when item does not exist', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck) => void>();

    socket.emit(
      'playback:change-track',
      { playlistItemId: 'missing-item', roomId: roomFixture.room.id },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PLAYLIST_ITEM_NOT_FOUND',
        message: 'Playlist item not found',
      },
    });
  });

  it('acks chat send and echoes received message', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck<{ id: string; createdAt: string }>) => void>();
    const listener = vi.fn<(payload: ChatMessage) => void>();

    socket.on('chat:received', listener);
    socket.emit('chat:send', { message: 'hi', roomId: roomFixture.room.id }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        createdAt: expect.any(String) as string,
        id: expect.any(String) as string,
      }),
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'hi',
        type: 'user',
      }),
    );
  });
});
