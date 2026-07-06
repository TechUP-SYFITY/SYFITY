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

  const membership = await roomRepo.findMembership(roomId, userId);
  if (!membership || membership.status === 'left') {
    throw new AppError(403, ERROR_CODES.ROOM_ACCESS_DENIED, 'Room 참여자만 접근할 수 있습니다.');
  }

  return room;
}
