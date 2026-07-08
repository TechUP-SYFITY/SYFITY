import type { Server, Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES, type PlaylistItem } from '@syfity/shared';

import { registerPlaybackHandlers } from './playback.handler';
import { AppError } from '../../errors/appError';
import { logger } from '../../lib/logger';
import type { PlaybackService } from '../../services/playback.service';
import type {
  PlaybackAck,
  PlaybackChangeTrackPayload,
  PlaybackErrorPayload,
  PlaybackPausePayload,
  PlaybackPlayPayload,
  PlaybackSeekPayload,
  PlaybackStatePayload,
  PlaybackSyncRequestPayload,
} from '../../types/socket';

type PlaybackCallback =
  | ((
      payload: PlaybackPlayPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => Promise<void>)
  | ((
      payload: PlaybackPausePayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => Promise<void>)
  | ((
      payload: PlaybackSeekPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => Promise<void>)
  | ((
      payload: PlaybackChangeTrackPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => Promise<void>)
  | ((
      payload: PlaybackErrorPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => Promise<void>)
  | ((payload: PlaybackSyncRequestPayload | null | undefined) => Promise<void>);
type PlaybackHandlerService = Pick<
  PlaybackService,
  'play' | 'pause' | 'seek' | 'changeTrack' | 'reportError' | 'getPlaybackStateForSocket'
>;
type PlaybackHandlerAck = (response: PlaybackAck) => void;

const playbackState: PlaybackStatePayload = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  currentTime: 30,
  isPlaying: true,
};

const playlist: PlaylistItem[] = [
  {
    id: 'playlist-item-1',
    videoId: 'video-1',
    title: 'Song One',
    channelTitle: 'Channel One',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    duration: 180,
    position: 1,
    addedBy: 'user-1',
    status: 'unavailable',
  },
];

function makePlaybackService(
  overrides: Partial<PlaybackHandlerService> = {},
): PlaybackHandlerService {
  return {
    play: vi.fn().mockResolvedValue({ payload: playbackState, broadcastEvent: 'playback:play' }),
    pause: vi.fn().mockResolvedValue(playbackState),
    seek: vi.fn().mockResolvedValue(playbackState),
    changeTrack: vi.fn().mockResolvedValue(playbackState),
    reportError: vi.fn().mockResolvedValue({
      errorPayload: { videoId: 'video-1', errorCode: 150 },
      playlist: null,
    }),
    getPlaybackStateForSocket: vi.fn().mockResolvedValue(playbackState),
    ...overrides,
  };
}

function makeSocket(): { socket: Socket; handlers: Record<string, PlaybackCallback> } {
  const handlers: Record<string, PlaybackCallback> = {};
  const on = vi.fn((event: string, callback: PlaybackCallback) => {
    handlers[event] = callback;
  });
  const socketRef = {
    data: { userId: 'user-1' },
    emit: vi.fn(),
    on,
  };

  return { socket: socketRef as unknown as Socket, handlers };
}

function makeIo(): { io: Server; roomEmit: ReturnType<typeof vi.fn> } {
  const roomEmit = vi.fn();
  const io = {
    to: vi.fn().mockReturnValue({ emit: roomEmit }),
  } as unknown as Server;

  return { io, roomEmit };
}

describe('registerPlaybackHandlers', () => {
  let loggerError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('playback:play 성공 시 반환된 이벤트명으로 Room 전체에 broadcast한다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:play'] as (
        payload: PlaybackPlayPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', currentTime: 30 }, ack);

    expect(playbackService.play).toHaveBeenCalledWith('room-1', 'user-1', 30);
    expect(io.to).toHaveBeenCalledWith('room:room-1');
    expect(roomEmit).toHaveBeenCalledWith('playback:play', playbackState);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('playback:play가 첫 곡 선택 결과를 반환하면 change-track으로 broadcast한다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService({
      play: vi.fn().mockResolvedValue({
        payload: playbackState,
        broadcastEvent: 'playback:change-track',
      }),
    });

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:play'] as (
        payload: PlaybackPlayPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', currentTime: 0 }, ack);

    expect(roomEmit).toHaveBeenCalledWith('playback:change-track', playbackState);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('playback:play 유효성 오류는 ack error로 반환하고 service를 호출하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:play'] as (
        payload: Partial<PlaybackPlayPayload>,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'currentTime가 올바르지 않습니다.' },
    });
    expect(playbackService.play).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('playback:play service AppError는 ack error로 반환하고 broadcast하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService({
      play: vi
        .fn()
        .mockRejectedValue(
          new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 사용할 수 있습니다.'),
        ),
    });

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:play'] as (
        payload: PlaybackPlayPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', currentTime: 30 }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.AUTH_FORBIDDEN, message: 'Host만 사용할 수 있습니다.' },
    });
    expect(io.to).not.toHaveBeenCalled();
  });

  it('playback:pause/seek/change-track 성공 시 각각의 이벤트로 broadcast한다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:pause'] as (
        payload: PlaybackPausePayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', currentTime: 30 }, ack);
    await (
      handlers['playback:seek'] as (
        payload: PlaybackSeekPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', seekTime: 45 }, ack);
    await (
      handlers['playback:change-track'] as (
        payload: PlaybackChangeTrackPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', playlistItemId: 'playlist-item-1' }, ack);

    expect(playbackService.pause).toHaveBeenCalledWith('room-1', 'user-1', 30);
    expect(playbackService.seek).toHaveBeenCalledWith('room-1', 'user-1', 45);
    expect(playbackService.changeTrack).toHaveBeenCalledWith('room-1', 'user-1', 'playlist-item-1');
    expect(roomEmit).toHaveBeenCalledWith('playback:pause', playbackState);
    expect(roomEmit).toHaveBeenCalledWith('playback:seek', playbackState);
    expect(roomEmit).toHaveBeenCalledWith('playback:change-track', playbackState);
  });

  it('playback:change-track에서 playlistItemId가 없으면 VALIDATION_ERROR ack를 반환한다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:change-track'] as (
        payload: Partial<PlaybackChangeTrackPayload>,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1' }, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'playlistItemId가 필요합니다.' },
    });
    expect(playbackService.changeTrack).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('playback:error는 실패 이벤트만 broadcast하고 playlist가 없으면 playlist:updated를 보내지 않는다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:error'] as (
        payload: PlaybackErrorPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', videoId: 'video-1', errorCode: 150 }, ack);

    expect(playbackService.reportError).toHaveBeenCalledWith('room-1', 'user-1', 'video-1', 150);
    expect(roomEmit).toHaveBeenCalledWith('playback:error', { videoId: 'video-1', errorCode: 150 });
    expect(roomEmit).not.toHaveBeenCalledWith('playlist:updated', expect.anything());
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('playback:error는 playlist 변경 결과가 있으면 playlist:updated도 broadcast한다', async () => {
    const { io, roomEmit } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService({
      reportError: vi.fn().mockResolvedValue({
        errorPayload: { videoId: 'video-1', errorCode: 150 },
        playlist,
      }),
    });

    registerPlaybackHandlers(io, socket, { playbackService });
    const ack = vi.fn();
    await (
      handlers['playback:error'] as (
        payload: PlaybackErrorPayload,
        ack: PlaybackHandlerAck,
      ) => Promise<void>
    )({ roomId: 'room-1', videoId: 'video-1', errorCode: 150 }, ack);

    expect(roomEmit).toHaveBeenCalledWith('playback:error', { videoId: 'video-1', errorCode: 150 });
    expect(roomEmit).toHaveBeenCalledWith('playlist:updated', { playlist });
  });

  it('playback:sync-request 성공 시 요청 소켓에만 sync-response를 보낸다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService();

    registerPlaybackHandlers(io, socket, { playbackService });
    await (
      handlers['playback:sync-request'] as (payload: PlaybackSyncRequestPayload) => Promise<void>
    )({
      roomId: 'room-1',
    });

    expect(playbackService.getPlaybackStateForSocket).toHaveBeenCalledWith('room-1', 'user-1');
    expect(socket.emit).toHaveBeenCalledWith('playback:sync-response', playbackState);
    expect(io.to).not.toHaveBeenCalled();
  });

  it('playback:sync-request 실패는 핸들러 밖으로 전파하지 않는다', async () => {
    const { io } = makeIo();
    const { socket, handlers } = makeSocket();
    const playbackService = makePlaybackService({
      getPlaybackStateForSocket: vi.fn().mockRejectedValue(new Error('boom')),
    });

    registerPlaybackHandlers(io, socket, { playbackService });

    await expect(
      (handlers['playback:sync-request'] as (payload: PlaybackSyncRequestPayload) => Promise<void>)(
        {
          roomId: 'room-1',
        },
      ),
    ).resolves.toBeUndefined();
    expect(socket.emit).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });
});
