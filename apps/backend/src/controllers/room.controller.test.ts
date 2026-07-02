import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomController } from './room.controller';
import type { RecentRoomRecord } from '../types/user';

const recentRooms: RecentRoomRecord[] = [
  {
    id: 'room-1',
    name: 'Morning Jazz',
    inviteCode: 'ABCD1234',
    lastJoinedAt: new Date('2026-07-01T12:00:00.000Z'),
  },
];

function makeRequest(): ExRequest {
  return {
    user: { id: 'user-id', email: 'alice@example.com' },
  } as ExRequest;
}

function makeUserService() {
  return {
    getRecentRooms: vi.fn().mockResolvedValue(recentRooms),
  };
}

describe('RoomController', () => {
  it('GET /rooms/recent 응답을 반환한다', async () => {
    const userService = makeUserService();
    const controller = new RoomController(userService);

    await expect(controller.getRecentRooms(makeRequest())).resolves.toEqual({
      success: true,
      data: {
        rooms: [
          {
            id: 'room-1',
            name: 'Morning Jazz',
            inviteCode: 'ABCD1234',
            lastJoinedAt: '2026-07-01T12:00:00.000Z',
          },
        ],
      },
    });
    expect(userService.getRecentRooms).toHaveBeenCalledWith('user-id');
  });

  it('최근 방 목록이 비어 있으면 빈 배열을 반환한다', async () => {
    const userService = makeUserService();
    userService.getRecentRooms.mockResolvedValue([]);
    const controller = new RoomController(userService);

    await expect(controller.getRecentRooms(makeRequest())).resolves.toEqual({
      success: true,
      data: { rooms: [] },
    });
  });
});
