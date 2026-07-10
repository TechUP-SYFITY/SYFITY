import type { Server } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYBACK_TICK_INTERVAL_MS, startPlaybackTick, stopPlaybackTick } from './tick.handler';
import { logger } from '../../lib/logger';
import type { PlaybackService } from '../../services/playback.service';
import type { PlaybackStatePayload } from '../../types/socket';

type TickPlaybackService = Pick<PlaybackService, 'getPlayingRoomIds' | 'getStateForTick'>;

const playbackState: PlaybackStatePayload = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  currentTime: 30,
  isPlaying: true,
};

type EmitRecord = {
  room: string;
  event: string;
  payload: PlaybackStatePayload;
};

function makePlaybackService(overrides: Partial<TickPlaybackService> = {}): TickPlaybackService {
  return {
    getPlayingRoomIds: vi.fn().mockReturnValue(['room-1']),
    getStateForTick: vi.fn().mockResolvedValue(playbackState),
    ...overrides,
  };
}

function makeIo(): { io: Server; emits: EmitRecord[] } {
  const emits: EmitRecord[] = [];
  const io = {
    to: vi.fn((room: string) => ({
      emit: vi.fn((event: string, payload: PlaybackStatePayload) => {
        emits.push({ room, event, payload });
        return true;
      }),
    })),
  } as unknown as Server;

  return { io, emits };
}

describe('startPlaybackTick', () => {
  let loggerError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerError.mockRestore();
    vi.useRealTimers();
  });

  it('재생 중인 Room 1개에 10초마다 playback:tick을 broadcast한다', async () => {
    const { io, emits } = makeIo();
    const playbackService = makePlaybackService();
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS);
    stopPlaybackTick(timer);

    expect(playbackService.getPlayingRoomIds).toHaveBeenCalledTimes(1);
    expect(playbackService.getStateForTick).toHaveBeenCalledWith('room-1');
    expect(emits).toEqual([
      { room: 'room:room-1', event: 'playback:tick', payload: playbackState },
    ]);
  });

  it('재생 중인 Room 여러 개에 각각 playback:tick을 broadcast한다', async () => {
    const { io, emits } = makeIo();
    const playbackService = makePlaybackService({
      getPlayingRoomIds: vi.fn().mockReturnValue(['room-1', 'room-2']),
      getStateForTick: vi.fn(async (roomId: string) => ({
        ...playbackState,
        playlistItemId: `playlist-item-${roomId}`,
      })),
    });
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS);
    stopPlaybackTick(timer);

    expect(emits).toEqual([
      {
        room: 'room:room-1',
        event: 'playback:tick',
        payload: { ...playbackState, playlistItemId: 'playlist-item-room-1' },
      },
      {
        room: 'room:room-2',
        event: 'playback:tick',
        payload: { ...playbackState, playlistItemId: 'playlist-item-room-2' },
      },
    ]);
  });

  it('재생 중인 Room이 없으면 broadcast하지 않는다', async () => {
    const { io, emits } = makeIo();
    const playbackService = makePlaybackService({
      getPlayingRoomIds: vi.fn().mockReturnValue([]),
    });
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS);
    stopPlaybackTick(timer);

    expect(io.to).not.toHaveBeenCalled();
    expect(emits).toEqual([]);
  });

  it('특정 Room 조회가 실패해도 다른 Room broadcast는 유지한다', async () => {
    const { io, emits } = makeIo();
    const error = new Error('boom');
    const playbackService = makePlaybackService({
      getPlayingRoomIds: vi.fn().mockReturnValue(['room-1', 'room-2']),
      getStateForTick: vi.fn((roomId: string) =>
        roomId === 'room-2' ? Promise.reject(error) : Promise.resolve(playbackState),
      ),
    });
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS);
    stopPlaybackTick(timer);

    expect(emits).toEqual([
      { room: 'room:room-1', event: 'playback:tick', payload: playbackState },
    ]);
    expect(loggerError).toHaveBeenCalledWith(
      { err: error, roomId: 'room-2' },
      '[playback:tick] 처리 실패',
    );
  });

  it('30초 경과 시 3회 broadcast한다', async () => {
    const { io, emits } = makeIo();
    const playbackService = makePlaybackService();
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS * 3);
    stopPlaybackTick(timer);

    expect(emits).toHaveLength(3);
    expect(playbackService.getPlayingRoomIds).toHaveBeenCalledTimes(3);
  });

  it('stopPlaybackTick 호출 후에는 추가 broadcast하지 않는다', async () => {
    const { io, emits } = makeIo();
    const playbackService = makePlaybackService();
    const timer = startPlaybackTick(io, { playbackService });

    stopPlaybackTick(timer);
    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS * 2);

    expect(emits).toEqual([]);
    expect(playbackService.getPlayingRoomIds).not.toHaveBeenCalled();
  });

  it('getStateForTick payload를 가공 없이 전달한다', async () => {
    const { io, emits } = makeIo();
    const payload = {
      videoId: 'video-2',
      playlistItemId: 'playlist-item-2',
      currentTime: 55,
      isPlaying: true,
    };
    const playbackService = makePlaybackService({
      getStateForTick: vi.fn().mockResolvedValue(payload),
    });
    const timer = startPlaybackTick(io, { playbackService });

    await vi.advanceTimersByTimeAsync(PLAYBACK_TICK_INTERVAL_MS);
    stopPlaybackTick(timer);

    expect(emits[0]?.payload).toBe(payload);
  });
});
