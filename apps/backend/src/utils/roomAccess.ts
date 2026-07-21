import { ERROR_CODES } from '@syfity/shared';

import { AppError } from '../errors/appError';
import type { IRoomRepository, RoomDetailRecord } from '../types/room';

type RoomAccessRepository = Pick<IRoomRepository, 'findRoomById' | 'findMembership'>;

export async function assertActiveRoomMember(
  roomRepo: RoomAccessRepository,
  roomId: string,
  userId: string,
): Promise<RoomDetailRecord> {
  const room = await roomRepo.findRoomById(roomId);
  if (!room) {
    throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
  }
  if (room.status !== 'active') {
    throw new AppError(409, ERROR_CODES.ROOM_NOT_ACTIVE, 'active 상태의 Room이 아닙니다.');
  }

  const membership = await roomRepo.findMembership(roomId, userId);
  if (!membership || membership.status === 'left') {
    throw new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.');
  }
  if (membership.status === 'kicked') {
    throw new AppError(403, ERROR_CODES.ROOM_MEMBER_KICKED, 'Host에 의해 추방된 사용자입니다.');
  }

  return room;
}

export async function assertJoinableRoomMember(
  roomRepo: RoomAccessRepository,
  roomId: string,
  userId: string,
): Promise<RoomDetailRecord> {
  const room = await roomRepo.findRoomById(roomId);
  if (!room) {
    throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
  }
  if (room.status === 'closed') {
    throw new AppError(403, ERROR_CODES.ROOM_CLOSED, '종료된 Room입니다.');
  }
  if (room.status === 'inactive') {
    throw new AppError(403, ERROR_CODES.ROOM_INACTIVE, '비활성화된 Room입니다.');
  }

  const membership = await roomRepo.findMembership(roomId, userId);
  if (!membership) {
    throw new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여 이력이 없습니다.');
  }
  if (membership.status === 'kicked') {
    throw new AppError(403, ERROR_CODES.ROOM_MEMBER_KICKED, 'Host에 의해 추방된 사용자입니다.');
  }

  return room;
}

export async function assertRoomHost(
  roomRepo: RoomAccessRepository,
  roomId: string,
  userId: string,
): Promise<RoomDetailRecord> {
  const room = await assertActiveRoomMember(roomRepo, roomId, userId);
  if (room.hostId !== userId) {
    throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 사용할 수 있습니다.');
  }

  return room;
}

export async function assertRoomHostWithoutActiveStatus(
  roomRepo: RoomAccessRepository,
  roomId: string,
  userId: string,
): Promise<RoomDetailRecord> {
  const room = await roomRepo.findRoomById(roomId);
  if (!room) {
    throw new AppError(404, ERROR_CODES.ROOM_NOT_FOUND, '존재하지 않는 Room입니다.');
  }

  const membership = await roomRepo.findMembership(roomId, userId);
  if (!membership || membership.status === 'left') {
    throw new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.');
  }
  if (membership.status === 'kicked') {
    throw new AppError(403, ERROR_CODES.ROOM_MEMBER_KICKED, 'Host에 의해 추방된 사용자입니다.');
  }
  if (room.hostId !== userId) {
    throw new AppError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Host만 사용할 수 있습니다.');
  }

  return room;
}
