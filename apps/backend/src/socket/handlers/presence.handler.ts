import type { Server, Socket } from 'socket.io';

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
    await deps.roomService.closeRoom(roomId, hostUserId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[presence] host-timeout closeRoom 실패(이미 종료된 것으로 추정)', err);
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
