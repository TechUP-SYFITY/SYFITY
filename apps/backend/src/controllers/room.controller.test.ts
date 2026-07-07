import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomController } from './room.controller';
import type { ChatRecord } from '../types/chat';
import type { PlaylistItemRecord } from '../types/playlist';
import type {
  JoinRoomResult,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';
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
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const updatedRoom: RoomUpdateRecord = {
  id: 'room-1',
  name: 'Evening Jazz',
  updatedAt: new Date('2026-07-01T12:30:00.000Z'),
};

const playlistItem: PlaylistItemRecord = {
  id: 'playlist-item-1',
  videoId: 'video-1',
  title: 'Song One',
  channelTitle: 'Channel One',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  duration: 180,
  position: 1,
  addedBy: 'user-1',
  status: 'available',
  addedAt: new Date('2026-07-01T12:00:00.000Z'),
};

const member: RoomMemberRecord = {
  id: 'member-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: null,
  role: 'host',
  status: 'online',
};

const chat: ChatRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T11:59:00.000Z'),
};

const joinRoomResult: JoinRoomResult = {
  room: roomDetail,
  playbackState: {
    videoId: 'video-1',
    playlistItemId: 'playlist-item-1',
    currentTime: 35,
    isPlaying: true,
    updatedAt: '2026-07-01T12:00:10.000Z',
  },
  playlist: [playlistItem],
  members: [member],
  recentChats: [chat],
};

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
    joinRoom: vi.fn().mockResolvedValue(joinRoomResult),
    getRoomInfo: vi.fn().mockResolvedValue(roomDetail),
    updateRoom: vi.fn().mockResolvedValue(updatedRoom),
    closeRoomAndBroadcast: vi.fn().mockResolvedValue(undefined),
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

  it('POST /rooms/join 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(controller.joinRoom(makeRequest(), { inviteCode: 'ABC123' })).resolves.toEqual({
      success: true,
      data: {
        room: {
          id: 'room-1',
          name: 'Morning Jazz',
          status: 'active',
          inviteCode: 'ABC123',
          hostId: 'user-1',
        },
        playbackState: {
          videoId: 'video-1',
          playlistItemId: 'playlist-item-1',
          currentTime: 35,
          isPlaying: true,
          updatedAt: '2026-07-01T12:00:10.000Z',
        },
        playlist: [
          {
            id: 'playlist-item-1',
            videoId: 'video-1',
            title: 'Song One',
            channelTitle: 'Channel One',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            duration: 180,
            position: 1,
            addedBy: 'user-1',
            status: 'available',
          },
        ],
        members: [member],
        recentChats: [
          {
            id: 'message-1',
            userId: 'user-1',
            nickname: 'Alice',
            profileImage: 'https://example.com/alice.png',
            type: 'user',
            message: 'hello',
            createdAt: '2026-07-01T11:59:00.000Z',
          },
        ],
      },
    });
    expect(roomService.joinRoom).toHaveBeenCalledWith('user-id', 'ABC123');
  });

  it('POST /rooms/join service 에러를 그대로 전파한다', async () => {
    const error = new Error('join failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.joinRoom.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(controller.joinRoom(makeRequest(), { inviteCode: 'ABC123' })).rejects.toThrow(
      error,
    );
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
        updatedAt: '2026-07-01T12:30:00.000Z',
      },
    });
    expect(roomService.updateRoom).toHaveBeenCalledWith('room-1', 'user-id', 'Evening Jazz');
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

  it('POST /rooms/:roomId/close 응답을 반환한다', async () => {
    const userService = makeUserService();
    const roomService = makeRoomService();
    const controller = new RoomController(userService, roomService);

    await expect(controller.closeRoom('room-1', makeRequest())).resolves.toEqual({
      success: true,
      data: { message: 'room closed' },
    });
    expect(roomService.closeRoomAndBroadcast).toHaveBeenCalledWith('room-1', 'user-id');
  });

  it('POST /rooms/:roomId/close service 에러를 그대로 전파한다', async () => {
    const error = new Error('close failed');
    const userService = makeUserService();
    const roomService = makeRoomService();
    roomService.closeRoomAndBroadcast.mockRejectedValue(error);
    const controller = new RoomController(userService, roomService);

    await expect(controller.closeRoom('room-1', makeRequest())).rejects.toThrow(error);
  });
});
