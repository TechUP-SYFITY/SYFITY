import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { assertActiveRoomMember } from './roomAccess';
import type { IRoomRepository, RoomDetailRecord, RoomMembershipRecord } from '../types/room';

const room: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  status: 'active',
  inviteCode: 'ABC123',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

function makeRoomRepo(
  overrides: {
    room?: RoomDetailRecord | null;
    membership?: RoomMembershipRecord | null;
  } = {},
): Pick<IRoomRepository, 'findRoomById' | 'findMembership'> {
  return {
    findRoomById: vi.fn().mockResolvedValue('room' in overrides ? overrides.room : room),
    findMembership: vi
      .fn()
      .mockResolvedValue(
        'membership' in overrides ? overrides.membership : { role: 'member', status: 'offline' },
      ),
  };
}

describe('assertActiveRoomMember', () => {
  it('Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const roomRepo = makeRoomRepo({ room: null });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.findMembership).not.toHaveBeenCalled();
  });

  it('참여 기록이 없으면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: null });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it('left 상태면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'left' } });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it.each(['online', 'offline'] as const)('%s 상태 참여자면 Room을 반환한다', async (status) => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status } });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).resolves.toEqual(room);
    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
  });
});
