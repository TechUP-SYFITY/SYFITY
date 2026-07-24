import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomMemberController } from './room-member.controller';
import type { KickedMemberRecord, RoomMemberRecord } from '../types/room';

const activeMember: RoomMemberRecord = {
  id: 'member-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: null,
  role: 'host',
  status: 'online',
};

const kickedMember: KickedMemberRecord = {
  id: 'member-2',
  userId: 'user-2',
  nickname: 'Bob',
  profileImage: 'https://example.com/bob.png',
  kickedAt: new Date('2026-07-01T13:00:00.000Z'),
};

function makeRequest(): ExRequest {
  return { user: { id: 'user-1', email: 'alice@example.com' } } as ExRequest;
}

function makeRoomService() {
  return {
    getActiveMembers: vi.fn().mockResolvedValue([activeMember]),
    getKickedMembers: vi.fn().mockResolvedValue([kickedMember]),
    kickMember: vi.fn().mockResolvedValue({ memberId: 'member-2', status: 'kicked' }),
    unkickMember: vi.fn().mockResolvedValue({ memberId: 'member-2', status: 'left' }),
  };
}

describe('RoomMemberController', () => {
  it('GET 쿼리 없이 Host 활성 로스터를 반환한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomMemberController(roomService);

    await expect(controller.getMembers('room-1', makeRequest())).resolves.toEqual({
      success: true,
      data: { members: [activeMember] },
    });
    expect(roomService.getActiveMembers).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('GET status=kicked는 추방 목록을 직렬화한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomMemberController(roomService);

    await expect(controller.getMembers('room-1', makeRequest(), 'kicked')).resolves.toEqual({
      success: true,
      data: {
        members: [
          {
            id: 'member-2',
            userId: 'user-2',
            nickname: 'Bob',
            profileImage: 'https://example.com/bob.png',
            kickedAt: '2026-07-01T13:00:00.000Z',
          },
        ],
      },
    });
    expect(roomService.getKickedMembers).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it.each([
    [{ status: 'kicked' }, 'kickMember', 'kicked'],
    [{ status: 'left' }, 'unkickMember', 'left'],
  ] as const)('PATCH %o를 해당 서비스로 위임한다', async (body, method, status) => {
    const roomService = makeRoomService();
    const controller = new RoomMemberController(roomService);

    await expect(
      controller.updateMember('room-1', 'member-2', makeRequest(), body),
    ).resolves.toEqual({
      success: true,
      data: { memberId: 'member-2', status },
    });
    expect(roomService[method]).toHaveBeenCalledWith('room-1', 'user-1', 'member-2');
  });

  it('PATCH의 잘못된 status를 VALIDATION_ERROR로 거부한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomMemberController(roomService);

    await expect(
      controller.updateMember('room-1', 'member-2', makeRequest(), { status: 'online' } as never),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(roomService.kickMember).not.toHaveBeenCalled();
    expect(roomService.unkickMember).not.toHaveBeenCalled();
  });
});
