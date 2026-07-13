import type { Server, Socket } from 'socket.io';

import {
  playbackService as defaultPlaybackService,
  presenceService as defaultPresenceService,
  roomService as defaultRoomService,
} from '../../ioc';
import { logger } from '../../lib/logger';
import type { PlaybackService } from '../../services/playback.service';
import type { PresenceService } from '../../services/presence.service';
import type { RoomService } from '../../services/room.service';
import type {
  PresenceUpdatePayload,
  RoomClosedPayload,
  RoomJoinAck,
  RoomJoinPayload,
  RoomLeavePayload,
} from '../../types/socket';
import { toChatSystemPayload } from '../../utils/chatPayload';
import { toSocketAckError } from '../socketError';
import { assertRoomId } from '../socketValidators';

type RoomHandlerService = Pick<
  RoomService,
  'setMemberOnline' | 'getMembers' | 'leaveRoom' | 'createSystemMessage'
>;
type RoomHandlerPlaybackService = Pick<PlaybackService, 'getPlaybackStateForSocket'>;
type RoomHandlerPresenceService = Pick<
  PresenceService,
  'cancelMemberOfflineTimer' | 'cancelHostCloseTimer' | 'getHostConnectionState'
>;

type RoomHandlerDeps = {
  roomService: RoomHandlerService;
  playbackService: RoomHandlerPlaybackService;
  presenceService: RoomHandlerPresenceService;
};

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  deps: RoomHandlerDeps = {
    roomService: defaultRoomService,
    playbackService: defaultPlaybackService,
    presenceService: defaultPresenceService,
  },
): void {
  const { roomService, playbackService, presenceService } = deps;

  socket.on(
    'room:join',
    async (payload: RoomJoinPayload | null | undefined, ack: (response: RoomJoinAck) => void) => {
      try {
        assertRoomId(payload?.roomId);
        const { roomId } = payload;
        const userId = socket.data.userId;

        const { member, wasOnline } = await roomService.setMemberOnline(roomId, userId);
        presenceService.cancelMemberOfflineTimer(roomId, userId);
        const hostReconnected =
          member.role === 'host' && presenceService.cancelHostCloseTimer(roomId);
        const hostConnection = presenceService.getHostConnectionState(roomId);
        const [playbackState, members] = await Promise.all([
          playbackService.getPlaybackStateForSocket(roomId, userId),
          roomService.getMembers(roomId),
        ]);

        socket.join(`room:${roomId}`);

        if (hostReconnected) {
          io.to(`room:${roomId}`).emit('room:host-reconnected', { roomId });
        }

        const presencePayload: PresenceUpdatePayload = {
          userId: member.userId,
          nickname: member.nickname,
          profileImage: member.profileImage,
          role: member.role,
          status: member.status,
        };
        io.to(`room:${roomId}`).emit('presence:update', presencePayload);

        if (!wasOnline) {
          const systemMessage = await roomService.createSystemMessage(
            roomId,
            `${member.nickname}님이 입장했습니다.`,
          );
          if (systemMessage) {
            io.to(`room:${roomId}`).emit('chat:system', toChatSystemPayload(systemMessage));
          }
        }

        ack({ success: true, data: { hostConnection, members, playbackState } });
      } catch (err) {
        logger.error(
          { err, roomId: payload?.roomId, userId: socket.data.userId },
          '[room:join] 처리 실패',
        );
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on('room:leave', async (payload: RoomLeavePayload | null | undefined) => {
    try {
      assertRoomId(payload?.roomId);
      const { roomId } = payload;
      const userId = socket.data.userId;

      presenceService.cancelMemberOfflineTimer(roomId, userId);
      const result = await roomService.leaveRoom(roomId, userId);
      socket.leave(`room:${roomId}`);

      if (result.type === 'closed') {
        presenceService.cancelHostCloseTimer(roomId);

        const systemMessage = await roomService.createSystemMessage(
          roomId,
          'Room이 종료되었습니다.',
        );
        if (systemMessage) {
          io.to(`room:${roomId}`).emit('chat:system', toChatSystemPayload(systemMessage));
        }

        const closedPayload: RoomClosedPayload = { roomId, reason: 'host-left' };
        io.to(`room:${roomId}`).emit('room:closed', closedPayload);
        io.socketsLeave(`room:${roomId}`);
        return;
      }

      if (result.type === 'noop') {
        return;
      }

      const presencePayload: PresenceUpdatePayload = {
        userId: result.member.userId,
        nickname: result.member.nickname,
        profileImage: result.member.profileImage,
        role: result.member.role,
        status: result.member.status,
      };
      io.to(`room:${roomId}`).emit('presence:update', presencePayload);

      const systemMessage = await roomService.createSystemMessage(
        roomId,
        `${result.member.nickname}님이 퇴장했습니다.`,
      );
      if (systemMessage) {
        io.to(`room:${roomId}`).emit('chat:system', toChatSystemPayload(systemMessage));
      }
    } catch (err) {
      // room:leave는 ack가 없는 이벤트다. 클라이언트에 에러를 알릴 채널이 없으므로
      // broadcast로 대체하지 않고 서버 로그만 남긴다.
      logger.error(
        { err, roomId: payload?.roomId, userId: socket.data.userId },
        '[room:leave] 처리 실패',
      );
    }
  });
}
