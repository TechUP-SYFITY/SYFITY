import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomController } from './room.controller';
import type { RoomDetailRecord, RoomRecord, RoomUpdateRecord } from '../types/room';
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

const roomDetail: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  inviteCode: 'ABC123',
  status: 'active',
  closedAt: null,
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const updatedRoom: RoomUpdateRecord = {
  id: 'room-1',
  name: 'Evening Jazz',
  status: 'active',
  closedAt: null,
  updatedAt: new Date('2026-07-01T12:30:00.000Z'),
};

const myRooms = [
  {
    id: 'room-1',
    name: 'Morning Jazz',
    status: 'closed' as const,
    closedAt: new Date('2026-07-01T12:30:00.000Z'),
    updatedAt: new Date('2026-07-01T12:30:00.000Z'),
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
    deactivateRoom: vi.fn().mockResolvedValue(undefined),
    getMyRooms: vi.fn().mockResolvedValue(myRooms),
    getRoomInfo: vi.fn().mockResolvedValue(roomDetail),
    updateRoom: vi.fn().mockResolvedValue(updatedRoom),
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

  it('GET /rooms/:roomId 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(controller.getRoom('room-1', makeRequest())).resolves.toEqual({
      success: true,
      data: {
        id: 'room-1',
        name: 'Morning Jazz',
        status: 'active',
        inviteCode: 'ABC123',
        hostId: 'user-1',
        createdAt: '2026-07-01T12:00:00.000Z',
      },
    });
    expect(roomService.getRoomInfo).toHaveBeenCalledWith('room-1', 'user-id');
  });

  it('GET /rooms/mine 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(controller.getMyRooms(makeRequest())).resolves.toEqual({
      success: true,
      data: {
        rooms: [
          {
            id: 'room-1',
            name: 'Morning Jazz',
            status: 'closed',
            closedAt: '2026-07-01T12:30:00.000Z',
            updatedAt: '2026-07-01T12:30:00.000Z',
          },
        ],
      },
    });
    expect(roomService.getMyRooms).toHaveBeenCalledWith('user-id');
  });

  it('GET /rooms/:roomId service 에러를 그대로 전파한다', async () => {
    const error = new Error('get failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.getRoomInfo.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(controller.getRoom('room-1', makeRequest())).rejects.toThrow(error);
  });

  it('PATCH /rooms/:roomId 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(
      controller.updateRoom('room-1', makeRequest(), { name: 'Evening Jazz' }),
    ).resolves.toEqual({
      success: true,
      data: {
        id: 'room-1',
        name: 'Evening Jazz',
        status: 'active',
        closedAt: null,
        updatedAt: '2026-07-01T12:30:00.000Z',
      },
    });
    expect(roomService.updateRoom).toHaveBeenCalledWith('room-1', 'user-id', {
      name: 'Evening Jazz',
    });
  });

  it('PATCH /rooms/:roomId service 에러를 그대로 전파한다', async () => {
    const error = new Error('update failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.updateRoom.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(
      controller.updateRoom('room-1', makeRequest(), { name: 'Evening Jazz' }),
    ).rejects.toThrow(error);
  });

  it('PATCH /rooms/:roomId는 status: closed 요청을 서비스에 전달한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.updateRoom.mockResolvedValue({
      ...updatedRoom,
      status: 'closed',
      closedAt: new Date(),
    });
    const controller = new RoomController(userService, roomService);

    await controller.updateRoom('room-1', makeRequest(), { status: 'closed' });

    expect(roomService.updateRoom).toHaveBeenCalledWith('room-1', 'user-id', {
      status: 'closed',
    });
  });

  it('PATCH /rooms/:roomId는 name과 status 동시 요청을 거부한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomController(makeUserService(), roomService);

    await expect(
      controller.updateRoom('room-1', makeRequest(), {
        name: 'Evening Jazz',
        status: 'closed',
      } as never),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'name 또는 status: closed/active 중 하나가 필요합니다.',
    });
    expect(roomService.updateRoom).not.toHaveBeenCalled();
  });

  it('PATCH /rooms/:roomId는 status: active 단독 요청을 서비스에 전달한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomController(makeUserService(), roomService);

    await controller.updateRoom('room-1', makeRequest(), { status: 'active' });

    expect(roomService.updateRoom).toHaveBeenCalledWith('room-1', 'user-id', {
      status: 'active',
    });
  });

  it('DELETE /rooms/:roomId를 서비스에 전달한다', async () => {
    const roomService = makeRoomService();
    const controller = new RoomController(makeUserService(), roomService);

    await expect(controller.deactivateRoom('room-1', makeRequest())).resolves.toBeUndefined();

    expect(roomService.deactivateRoom).toHaveBeenCalledWith('room-1', 'user-id');
  });
});
