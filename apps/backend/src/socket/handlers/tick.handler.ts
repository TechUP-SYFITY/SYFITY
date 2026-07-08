import type { Server } from 'socket.io';

import { playbackService as defaultPlaybackService } from '../../ioc';
import type { PlaybackService } from '../../services/playback.service';

export const PLAYBACK_TICK_INTERVAL_MS = 10_000;

type TickPlaybackService = Pick<PlaybackService, 'getPlayingRoomIds' | 'getStateForTick'>;

type TickHandlerDeps = {
  playbackService: TickPlaybackService;
};

export function startPlaybackTick(
  io: Server,
  deps: TickHandlerDeps = { playbackService: defaultPlaybackService },
): NodeJS.Timeout {
  const { playbackService } = deps;

  return setInterval(() => {
    const roomIds = playbackService.getPlayingRoomIds();

    void Promise.allSettled(
      roomIds.map(async (roomId) => {
        const state = await playbackService.getStateForTick(roomId);
        io.to(`room:${roomId}`).emit('playback:tick', state);
      }),
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // eslint-disable-next-line no-console
          console.error(`[playback:tick] roomId=${roomIds[index]} 처리 실패`, result.reason);
        }
      });
    });
  }, PLAYBACK_TICK_INTERVAL_MS);
}

export function stopPlaybackTick(timer: NodeJS.Timeout): void {
  clearInterval(timer);
}
