import type { Server, Socket } from 'socket.io';

import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../../errors/appError';
import {
  presenceService as defaultPresenceService,
  roomService as defaultRoomService,
} from '../../ioc';
import { HOST_CLOSE_TIMEOUT_MS, type PresenceService } from '../../services/presence.service';
import type { RoomService } from '../../services/room.service';
import type {
  PresenceUpdatePayload,
  RoomClosedPayload,
  RoomHostDisconnectedPayload,
} from '../../types/socket';
import { toChatSystemPayload } from '../../utils/chatPayload';

type PresenceHandlerPresenceService = Pick<
  PresenceService,
  | 'getActiveMembershipRole'
  | 'scheduleMemberOfflineTimer'
  | 'cancelMemberOfflineTimer'
  | 'scheduleHostCloseTimer'
  | 'cancelHostCloseTimer'
  | 'setMemberOffline'
>;
type PresenceHandlerRoomService = Pick<RoomService, 'closeRoom' | 'createSystemMessage'>;

type PresenceHandlerDeps = {
  presenceService: PresenceHandlerPresenceService;
  roomService: PresenceHandlerRoomService;
};

const ROOM_PREFIX = 'room:';

export function registerPresenceHandlers(
  io: Server,
  socket: Socket,
  deps: PresenceHandlerDeps = {
    presenceService: defaultPresenceService,
    roomService: defaultRoomService,
  },
): void {
  socket.on('disconnecting', () => {
    const userId = socket.data.userId;
    const roomKeys = [...socket.rooms].filter((room) => room.startsWith(ROOM_PREFIX));

    for (const roomKey of roomKeys) {
      const roomId = roomKey.slice(ROOM_PREFIX.length);
      void handleRoomDisconnect(io, socket, roomKey, roomId, userId, deps);
    }
  });
}

async function hasOtherActiveSocket(
  io: Server,
  socket: Socket,
  roomKey: string,
  userId: string,
): Promise<boolean> {
  const sockets = await io.in(roomKey).fetchSockets();
  return sockets.some((s) => s.id !== socket.id && s.data.userId === userId);
}

async function hasActiveSocketForUser(
  io: Server,
  roomKey: string,
  userId: string,
): Promise<boolean> {
  const sockets = await io.in(roomKey).fetchSockets();
  return sockets.some((s) => s.data.userId === userId);
}

async function handleRoomDisconnect(
  io: Server,
  socket: Socket,
  roomKey: string,
  roomId: string,
  userId: string,
  deps: PresenceHandlerDeps,
): Promise<void> {
  try {
    if (await hasOtherActiveSocket(io, socket, roomKey, userId)) return;

    const role = await deps.presenceService.getActiveMembershipRole(roomId, userId);
    if (!role) return;

    // getActiveMembershipRole 대기 중 재연결(room:join)이 먼저 끝나 취소할 타이머가
    // 없는 채로 지나갔을 수 있으므로, 스케줄 직전에 다시 한 번 확인한다.
    if (await hasOtherActiveSocket(io, socket, roomKey, userId)) return;

    deps.presenceService.scheduleMemberOfflineTimer(roomId, userId, () => {
      void handleMemberOfflineTimeout(io, roomId, userId, deps);
    });

    if (role === 'host') {
      const payload: RoomHostDisconnectedPayload = {
        roomId,
        waitUntil: new Date(Date.now() + HOST_CLOSE_TIMEOUT_MS).toISOString(),
      };
      io.to(roomKey).emit('room:host-disconnected', payload);

      deps.presenceService.scheduleHostCloseTimer(roomId, () => {
        void handleHostTimeout(io, roomId, userId, deps);
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[presence] disconnect 처리 실패', err);
  }
}

async function handleMemberOfflineTimeout(
  io: Server,
  roomId: string,
  userId: string,
  deps: PresenceHandlerDeps,
): Promise<void> {
  deps.presenceService.cancelMemberOfflineTimer(roomId, userId);

  try {
    // 타이머 예약 이후 재연결이 뒤늦게 완료돼 취소가 누락됐을 수 있으므로,
    // 실제로 offline 전환하기 전에 현재 활성 소켓 여부를 한번 더 확인한다.
    if (await hasActiveSocketForUser(io, `room:${roomId}`, userId)) return;

    const member = await deps.presenceService.setMemberOffline(roomId, userId);
    if (!member) return;

    const payload: PresenceUpdatePayload = {
      userId: member.userId,
      nickname: member.nickname,
      profileImage: member.profileImage,
      role: member.role,
      status: member.status,
    };
    io.to(`room:${roomId}`).emit('presence:update', payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[presence] offline 처리 실패', err);
  }
}

async function handleHostTimeout(
  io: Server,
  roomId: string,
  hostUserId: string,
  deps: PresenceHandlerDeps,
): Promise<void> {
  deps.presenceService.cancelHostCloseTimer(roomId);

  try {
    // 타이머 예약 이후 Host가 뒤늦게 재연결해 취소가 누락됐을 수 있으므로,
    // Room을 닫기 전에 현재 활성 소켓 여부를 한번 더 확인한다.
    if (await hasActiveSocketForUser(io, `room:${roomId}`, hostUserId)) return;

    await deps.roomService.closeRoom(roomId, hostUserId);
  } catch (err) {
    if (err instanceof AppError && err.code === ERROR_CODES.ROOM_ACCESS_DENIED) {
      // eslint-disable-next-line no-console
      console.error('[presence] host-timeout closeRoom 생략(이미 종료됨)', err);
      return;
    }

    // eslint-disable-next-line no-console
    console.error('[presence] host-timeout closeRoom 실패', err);
    return;
  }

  const systemMessage = await deps.roomService.createSystemMessage(
    roomId,
    'Room이 종료되었습니다.',
  );
  if (systemMessage) {
    io.to(`room:${roomId}`).emit('chat:system', toChatSystemPayload(systemMessage));
  }

  const payload: RoomClosedPayload = { roomId, reason: 'host-timeout' };
  io.to(`room:${roomId}`).emit('room:closed', payload);
  io.socketsLeave(`room:${roomId}`);
}
