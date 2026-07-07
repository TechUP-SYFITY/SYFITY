import type { Server, Socket } from 'socket.io';

import { playbackService as defaultPlaybackService } from '../../ioc';
import type { PlaybackService } from '../../services/playback.service';
import type {
  PlaybackAck,
  PlaybackChangeTrackPayload,
  PlaybackErrorPayload,
  PlaybackPausePayload,
  PlaybackPlayPayload,
  PlaybackSeekPayload,
  PlaybackSyncRequestPayload,
} from '../../types/socket';
import { toSocketAckError } from '../socketError';
import { assertFiniteNumber, assertNonEmptyString, assertRoomId } from '../socketValidators';

type PlaybackHandlerService = Pick<
  PlaybackService,
  'play' | 'pause' | 'seek' | 'changeTrack' | 'reportError' | 'getPlaybackStateForSocket'
>;

type PlaybackHandlerDeps = {
  playbackService: PlaybackHandlerService;
};

export function registerPlaybackHandlers(
  io: Server,
  socket: Socket,
  deps: PlaybackHandlerDeps = { playbackService: defaultPlaybackService },
): void {
  const { playbackService } = deps;

  socket.on(
    'playback:play',
    async (
      payload: PlaybackPlayPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertFiniteNumber(payload?.currentTime, 'currentTime');
        const { roomId, currentTime } = payload;
        const userId = socket.data.userId;

        const { payload: state, broadcastEvent } = await playbackService.play(
          roomId,
          userId,
          currentTime,
        );
        io.to(`room:${roomId}`).emit(broadcastEvent, state);
        ack({ success: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:play] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:pause',
    async (
      payload: PlaybackPausePayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertFiniteNumber(payload?.currentTime, 'currentTime');
        const { roomId, currentTime } = payload;
        const userId = socket.data.userId;

        const state = await playbackService.pause(roomId, userId, currentTime);
        io.to(`room:${roomId}`).emit('playback:pause', state);
        ack({ success: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:pause] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:seek',
    async (
      payload: PlaybackSeekPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertFiniteNumber(payload?.seekTime, 'seekTime');
        const { roomId, seekTime } = payload;
        const userId = socket.data.userId;

        const state = await playbackService.seek(roomId, userId, seekTime);
        io.to(`room:${roomId}`).emit('playback:seek', state);
        ack({ success: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:seek] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:change-track',
    async (
      payload: PlaybackChangeTrackPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertNonEmptyString(payload?.playlistItemId, 'playlistItemId');
        const { roomId, playlistItemId } = payload;
        const userId = socket.data.userId;

        const state = await playbackService.changeTrack(roomId, userId, playlistItemId);
        io.to(`room:${roomId}`).emit('playback:change-track', state);
        ack({ success: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:change-track] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:error',
    async (
      payload: PlaybackErrorPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertNonEmptyString(payload?.videoId, 'videoId');
        assertFiniteNumber(payload?.errorCode, 'errorCode');
        const { roomId, videoId, errorCode } = payload;
        const userId = socket.data.userId;

        const result = await playbackService.reportError(roomId, userId, videoId, errorCode);
        io.to(`room:${roomId}`).emit('playback:error', result.errorPayload);
        if (result.playlist) {
          io.to(`room:${roomId}`).emit('playlist:updated', { playlist: result.playlist });
        }
        ack({ success: true });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:error] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:sync-request',
    async (payload: PlaybackSyncRequestPayload | null | undefined) => {
      try {
        assertRoomId(payload?.roomId);
        const { roomId } = payload;
        const userId = socket.data.userId;

        const state = await playbackService.getPlaybackStateForSocket(roomId, userId);
        socket.emit('playback:sync-response', state);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[playback:sync-request] 처리 실패', err);
      }
    },
  );
}
