import type { Server, Socket } from 'socket.io';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../../errors/appError';
import { roomService as defaultRoomService } from '../../ioc';
import type { RoomService } from '../../services/room.service';
import type {
  PresenceUpdatePayload,
  RoomClosedPayload,
  RoomJoinAck,
  RoomJoinPayload,
  RoomLeavePayload,
} from '../../types/socket';
import { toSocketAckError } from '../socketError';

type RoomHandlerService = Pick<
  RoomService,
  'setMemberOnline' | 'leaveRoom' | 'getPlaybackStateForSocket'
>;

type RoomHandlerDeps = {
  roomService: RoomHandlerService;
};

function assertRoomId(roomId: unknown): asserts roomId is string {
  if (typeof roomId !== 'string' || roomId.length === 0) {
    throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, 'roomId가 필요합니다.');
  }
}

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  deps: RoomHandlerDeps = { roomService: defaultRoomService },
): void {
  const { roomService } = deps;

  socket.on(
    'room:join',
    async (payload: RoomJoinPayload | null | undefined, ack: (response: RoomJoinAck) => void) => {
      try {
        assertRoomId(payload?.roomId);
        const { roomId } = payload;
        const userId = socket.data.userId;

        const member = await roomService.setMemberOnline(roomId, userId);
        const playbackState = await roomService.getPlaybackStateForSocket(roomId);

        socket.join(`room:${roomId}`);

        const presencePayload: PresenceUpdatePayload = {
          userId: member.userId,
          nickname: member.nickname,
          profileImage: member.profileImage,
          role: member.role,
          status: member.status,
        };
        io.to(`room:${roomId}`).emit('presence:update', presencePayload);

        ack({ success: true, data: { playbackState } });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[room:join] 처리 실패', err);
        ack({ success: false, error: toSocketAckError(err) });
      }
    },
  );

  socket.on('room:leave', async (payload: RoomLeavePayload | null | undefined) => {
    try {
      assertRoomId(payload?.roomId);
      const { roomId } = payload;
      const userId = socket.data.userId;

      const result = await roomService.leaveRoom(roomId, userId);
      socket.leave(`room:${roomId}`);

      if (result.type === 'closed') {
        const closedPayload: RoomClosedPayload = { roomId, reason: 'host-left' };
        io.to(`room:${roomId}`).emit('room:closed', closedPayload);
        io.socketsLeave(`room:${roomId}`);
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
    } catch (err) {
      // room:leave는 ack가 없는 이벤트다. 클라이언트에 에러를 알릴 채널이 없으므로
      // broadcast로 대체하지 않고 서버 로그만 남긴다.
      // eslint-disable-next-line no-console
      console.error('[room:leave] 처리 실패', err);
    }
  });
}
