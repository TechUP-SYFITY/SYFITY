import type { Server, Socket } from 'socket.io';

import { playbackService as defaultPlaybackService } from '../../ioc';
import { logger } from '../../lib/logger';
import type { PlaybackService } from '../../services/playback.service';
import type {
  PlaybackAck,
  PlaybackChangeTrackPayload,
  PlaybackErrorPayload,
  PlaybackEndedPayload,
  PlaybackPausePayload,
  PlaybackPlayPayload,
  PlaybackSeekPayload,
  PlaybackSyncRequestPayload,
  PlaybackUpdateSettingsPayload,
} from '../../types/socket';
import { toSocketAckError } from '../socketError';
import {
  assertChangeTrackAction,
  assertFiniteNumber,
  assertNonEmptyString,
  assertRoomId,
  assertUpdateSettingsPayload,
} from '../socketValidators';

type PlaybackHandlerService = Pick<
  PlaybackService,
  | 'play'
  | 'pause'
  | 'seek'
  | 'selectTrack'
  | 'nextTrack'
  | 'previousTrack'
  | 'updateSettings'
  | 'reportEnded'
  | 'reportError'
  | 'getPlaybackStateForSocket'
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
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:play] 처리 실패',
        );
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
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:pause] 처리 실패',
        );
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
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:seek] 처리 실패',
        );
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
        assertChangeTrackAction(payload?.action);
        const { roomId, action } = payload;
        const userId = socket.data.userId;
        let result: Awaited<ReturnType<typeof playbackService.nextTrack>>;
        if (action === 'select') {
          assertNonEmptyString(payload.playlistItemId, 'playlistItemId');
          result = await playbackService.selectTrack(roomId, userId, payload.playlistItemId);
        } else if (action === 'next') {
          result = await playbackService.nextTrack(roomId, userId);
        } else {
          result = await playbackService.previousTrack(roomId, userId);
        }
        io.to(`room:${roomId}`).emit(result.broadcastEvent, result.payload);
        ack({ success: true });
      } catch (err) {
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:change-track] 처리 실패',
        );
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:update-settings',
    async (
      payload: PlaybackUpdateSettingsPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertUpdateSettingsPayload(payload);
        const { roomId, repeatMode, shuffleEnabled } = payload;
        const settings = await playbackService.updateSettings(roomId, socket.data.userId, {
          repeatMode,
          shuffleEnabled,
        });
        io.to(`room:${roomId}`).emit('playback:settings', settings);
        ack({ success: true });
      } catch (err) {
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:update-settings] 처리 실패',
        );
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on(
    'playback:ended',
    async (
      payload: PlaybackEndedPayload | null | undefined,
      ack: (response: PlaybackAck) => void,
    ) => {
      try {
        assertRoomId(payload?.roomId);
        assertNonEmptyString(payload?.playlistItemId, 'playlistItemId');
        assertFiniteNumber(payload?.playbackVersion, 'playbackVersion');
        const result = await playbackService.reportEnded(
          payload.roomId,
          socket.data.userId,
          payload.playlistItemId,
          payload.playbackVersion,
        );
        if (result) io.to(`room:${payload.roomId}`).emit(result.broadcastEvent, result.payload);
        ack({ success: true });
      } catch (err) {
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:ended] 처리 실패',
        );
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
        if (result.playlist) {
          io.to(`room:${roomId}`).emit('playlist:updated', { playlist: result.playlist });
        }
        io.to(`room:${roomId}`).emit('playback:error', result.errorPayload);
        if (result.transition) {
          io.to(`room:${roomId}`).emit(result.transition.broadcastEvent, result.transition.payload);
        }
        ack({ success: true });
      } catch (err) {
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:error] 처리 실패',
        );
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
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[playback:sync-request] 처리 실패',
        );
      }
    },
  );
}
