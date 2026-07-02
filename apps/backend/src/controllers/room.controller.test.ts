import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomController } from './room.controller';
import type { RoomRecord } from '../types/room';
import type { RecentRoomRecord } from '../types/user';

const createdRoom: RoomRecord = {
  id: 'room-2',
  name: 'Night Drive',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T13:00:00.000Z'),
};

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

function makeRoomService() {
  return {
    createRoom: vi.fn().mockResolvedValue(createdRoom),
  };
}

describe('RoomController', () => {
  it('POST /rooms 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(controller.createRoom(makeRequest(), { name: 'Night Drive' })).resolves.toEqual({
      success: true,
      data: {
        id: 'room-2',
        name: 'Night Drive',
        inviteCode: 'ABC123',
        status: 'active',
        createdAt: '2026-07-01T13:00:00.000Z',
      },
    });
    expect(roomService.createRoom).toHaveBeenCalledWith('user-id', 'Night Drive');
  });

  it('POST /rooms service 에러를 그대로 전파한다', async () => {
    const error = new Error('create failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.createRoom.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(controller.createRoom(makeRequest(), { name: 'Night Drive' })).rejects.toThrow(
      error,
    );
  });

  it('GET /rooms/recent 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

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
    const roomService = makeRoomService();
    userService.getRecentRooms.mockResolvedValue([]);
    const controller = new RoomController(userService, roomService);

    await expect(controller.getRecentRooms(makeRequest())).resolves.toEqual({
      success: true,
      data: { rooms: [] },
    });
  });

  it('GET /rooms/recent service 에러를 그대로 전파한다', async () => {
    const error = new Error('recent failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    userService.getRecentRooms.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(controller.getRecentRooms(makeRequest())).rejects.toThrow(error);
  });
});
