import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { assertActiveRoomMember, assertJoinableRoomMember, assertRoomHost } from './roomAccess';
import type { IRoomRepository, RoomDetailRecord, RoomMembershipRecord } from '../types/room';

const room: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  status: 'active',
  inviteCode: 'ABC123',
  closedAt: null,
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

  it.each(['closed', 'inactive'] as const)(
    '%s Room이면 ROOM_NOT_ACTIVE를 던진다',
    async (status) => {
      const roomRepo = makeRoomRepo({ room: { ...room, status } });

      await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
        status: 409,
        code: ERROR_CODES.ROOM_NOT_ACTIVE,
      });
      expect(roomRepo.findMembership).not.toHaveBeenCalled();
    },
  );

  it('left 상태면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'left' } });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it('kicked 상태면 ROOM_MEMBER_KICKED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'kicked' } });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_MEMBER_KICKED,
    });
  });

  it.each(['online', 'offline'] as const)('%s 상태 참여자면 Room을 반환한다', async (status) => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status } });

    await expect(assertActiveRoomMember(roomRepo, 'room-1', 'user-1')).resolves.toEqual(room);
    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
  });
});

describe('assertJoinableRoomMember', () => {
  it.each([
    ['closed', ERROR_CODES.ROOM_CLOSED],
    ['inactive', ERROR_CODES.ROOM_INACTIVE],
  ] as const)('%s Room은 입장을 거부한다', async (status, code) => {
    const roomRepo = makeRoomRepo({ room: { ...room, status } });

    await expect(assertJoinableRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code,
    });
  });

  it('참여 이력이 없으면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: null });

    await expect(assertJoinableRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it('left 상태 멤버의 재입장을 허용한다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'left' } });

    await expect(assertJoinableRoomMember(roomRepo, 'room-1', 'user-1')).resolves.toEqual(room);
  });

  it('이미 병합된 추방 상태는 ROOM_MEMBER_KICKED로 차단한다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'kicked' } });

    await expect(assertJoinableRoomMember(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_MEMBER_KICKED,
    });
  });
});

describe('assertRoomHost', () => {
  it('Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const roomRepo = makeRoomRepo({ room: null });

    await expect(assertRoomHost(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.findMembership).not.toHaveBeenCalled();
  });

  it('참여 기록이 없으면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: null });

    await expect(assertRoomHost(roomRepo, 'room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it('Host가 아니면 AUTH_FORBIDDEN을 던진다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'member', status: 'online' } });

    await expect(assertRoomHost(roomRepo, 'room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
  });

  it('Host이면 Room을 반환한다', async () => {
    const roomRepo = makeRoomRepo({ membership: { role: 'host', status: 'online' } });

    await expect(assertRoomHost(roomRepo, 'room-1', 'user-1')).resolves.toEqual(room);
    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
  });
});
