import { afterEach, describe, expect, it, vi } from 'vitest';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { SocketAck } from '@/shared/types/api';
import type { ChatMessage, PlaybackState } from '@/shared/types/domain';

import { fakeSocketClient, simulateServerEvent } from './fakeSocketClient';

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

  it('emits room snapshot before acknowledging room join', () => {
    const socket = fakeSocketClient.connect();
    const calls: string[] = [];
    const ack = vi.fn<(response: SocketAck) => void>(() => calls.push('ack'));
    const joined = vi.fn(() => calls.push('joined'));
    socket.on('room:joined', joined);

    socket.emit('room:join', { roomId: roomFixture.room.id }, ack);

    expect(calls).toEqual(['joined', 'ack']);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(joined).toHaveBeenCalledWith(
      expect.objectContaining({
        playlist: roomFixture.playlist,
        recentChats: roomFixture.chats,
      }),
    );
  });

  it('selects the first available item when playback starts without a selected video', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck) => void>();
    const listener = vi.fn<(payload: PlaybackState) => void>();
    const firstAvailable = roomFixture.playlist.find((item) => item.status === 'available');

    socket.on('playback:change-track', listener);
    socket.emit('playback:play', { currentTime: 10, roomId: roomFixture.room.id }, ack);

    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTime: 0,
        isPlaying: true,
        playlistItemId: firstAvailable?.id,
        videoId: firstAvailable?.videoId,
      }),
    );
  });

  it('emits system chat when playback starts', () => {
    const socket = fakeSocketClient.connect();
    const listener = vi.fn<(payload: ChatMessage) => void>();

    socket.on('chat:system', listener);
    socket.emit('playback:play', { currentTime: 10, roomId: roomFixture.room.id }, vi.fn());

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Host가 재생을 시작했습니다.',
        type: 'system',
      }),
    );
  });

  it('emits system chat when playback pauses', () => {
    const socket = fakeSocketClient.connect();
    const listener = vi.fn<(payload: ChatMessage) => void>();

    socket.on('chat:system', listener);
    socket.emit('playback:pause', { currentTime: 10, roomId: roomFixture.room.id }, vi.fn());

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Host가 일시정지했습니다.',
        type: 'system',
      }),
    );
  });

  it('fails playback change-track when item does not exist', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck) => void>();

    socket.emit(
      'playback:change-track',
      { action: 'select', playlistItemId: 'missing-item', roomId: roomFixture.room.id },
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

  it('fails playback change-track when item is unavailable', () => {
    const socket = fakeSocketClient.connect();
    const ack = vi.fn<(response: SocketAck) => void>();
    const unavailableItem = roomFixture.playlist.find((item) => item.status === 'unavailable');

    expect(unavailableItem).toBeDefined();
    if (!unavailableItem) {
      throw new Error('Expected an unavailable playlist item.');
    }

    socket.emit(
      'playback:change-track',
      { action: 'select', playlistItemId: unavailableItem.id, roomId: roomFixture.room.id },
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

  it('changes to the requested track and starts playback at 0 seconds', () => {
    const socket = fakeSocketClient.connect();
    const changeTrackAck = vi.fn<(response: SocketAck) => void>();
    const listener = vi.fn<(payload: PlaybackState) => void>();
    const availableItems = roomFixture.playlist.filter((item) => item.status === 'available');
    const nextItem = availableItems[1];

    expect(nextItem).toBeDefined();
    if (!nextItem) {
      throw new Error('Expected a second available playlist item.');
    }

    socket.on('playback:change-track', listener);
    socket.emit(
      'playback:change-track',
      { action: 'select', playlistItemId: nextItem.id, roomId: roomFixture.room.id },
      changeTrackAck,
    );

    expect(changeTrackAck).toHaveBeenCalledWith({ success: true });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        currentTime: 0,
        isPlaying: true,
        playlistItemId: nextItem.id,
        videoId: nextItem.videoId,
      }),
    );
  });

  it('emits chat received before acking chat send', () => {
    const socket = fakeSocketClient.connect();
    const calls: string[] = [];
    const ack = vi.fn<(response: SocketAck<{ id: string; createdAt: string }>) => void>(() => {
      calls.push('ack');
    });
    const listener = vi.fn<(payload: ChatMessage) => void>(() => {
      calls.push('received');
    });

    socket.on('chat:received', listener);
    socket.emit('chat:send', { message: 'hi', roomId: roomFixture.room.id }, ack);

    expect(calls).toEqual(['received', 'ack']);
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

  it('does nothing when a server event is simulated without a connection', () => {
    expect(() =>
      simulateServerEvent('presence:update', {
        nickname: '새 멤버',
        profileImage: null,
        role: 'member',
        status: 'online',
        userId: 'new-member',
      }),
    ).not.toThrow();
  });

  it('delivers simulated server events while connected', () => {
    const socket = fakeSocketClient.connect();
    const listener = vi.fn();
    const payload = {
      nickname: '새 멤버',
      profileImage: null,
      role: 'member' as const,
      status: 'online' as const,
      userId: 'new-member',
    };

    socket.on('presence:update', listener);
    simulateServerEvent('presence:update', payload);

    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('stops delivering simulated server events after disconnecting', () => {
    const socket = fakeSocketClient.connect();
    const listener = vi.fn();

    socket.on('presence:update', listener);
    fakeSocketClient.disconnect();
    simulateServerEvent('presence:update', {
      nickname: '새 멤버',
      profileImage: null,
      role: 'member',
      status: 'online',
      userId: 'new-member',
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
