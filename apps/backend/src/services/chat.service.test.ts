import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { ChatService } from './chat.service';
import { logger } from '../lib/logger';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { IRoomRepository, RoomDetailRecord } from '../types/room';

const chat: ChatRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T11:59:00.000Z'),
};

const room: RoomDetailRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'user-1',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

function makeChatRepo(overrides: Partial<IChatRepository> = {}): IChatRepository {
  return {
    findChatsByCursor: vi.fn().mockResolvedValue([chat]),
    findLatestChats: vi.fn().mockResolvedValue([chat]),
    createMessage: vi.fn().mockResolvedValue(chat),
    ...overrides,
  };
}

function makeRoomRepo(overrides: Partial<IRoomRepository> = {}): IRoomRepository {
  return {
    existsInviteCode: vi.fn().mockResolvedValue(false),
    createRoom: vi.fn().mockResolvedValue(room),
    existsRoom: vi.fn().mockResolvedValue(true),
    findRoomById: vi.fn().mockResolvedValue(room),
    findRoomByInviteCode: vi.fn().mockResolvedValue(room),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
    findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'offline' }),
    upsertMembership: vi.fn().mockResolvedValue(undefined),
    findMembers: vi.fn().mockResolvedValue([]),
    upsertRecentRoom: vi.fn().mockResolvedValue(undefined),
    updateMemberStatus: vi.fn().mockResolvedValue(undefined),
    findMemberInfo: vi.fn().mockResolvedValue(null),
    closeRoom: vi.fn().mockResolvedValue(undefined),
    updateRoomName: vi.fn().mockResolvedValue({
      id: 'room-1',
      name: 'Morning Jazz',
      updatedAt: new Date('2026-07-01T12:30:00.000Z'),
    }),
    ...overrides,
  };
}

describe('ChatService', () => {
  it('채팅 메시지를 trim 후 저장하고 Room lastActivity를 갱신한다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo();
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-1',
        userId: 'user-1',
        message: '  hello  ',
      }),
    ).resolves.toEqual(chat);

    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
    expect(chatRepo.createMessage).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: 'user-1',
      type: 'user',
      message: 'hello',
    });
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
  });

  it('Room lastActivity 갱신 실패는 채팅 전송을 실패시키지 않는다', async () => {
    const error = new Error('touch failed');
    const loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo({ touchLastActivity: vi.fn().mockRejectedValue(error) });
    const service = new ChatService(chatRepo, roomRepo);

    try {
      await expect(
        service.sendMessage({
          roomId: 'room-1',
          userId: 'user-1',
          message: 'hello',
        }),
      ).resolves.toEqual(chat);

      expect(chatRepo.createMessage).toHaveBeenCalledWith({
        roomId: 'room-1',
        userId: 'user-1',
        type: 'user',
        message: 'hello',
      });
      expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
      expect(loggerError).toHaveBeenCalledWith(
        { err: error, roomId: 'room-1' },
        '[ChatService.sendMessage] Room lastActivity 갱신 실패',
      );
    } finally {
      loggerError.mockRestore();
    }
  });

  it('공백 메시지는 VALIDATION_ERROR를 던지고 저장하지 않는다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo();
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-1',
        userId: 'user-1',
        message: '   ',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });

    expect(roomRepo.findRoomById).not.toHaveBeenCalled();
    expect(chatRepo.createMessage).not.toHaveBeenCalled();
    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
  });

  it('300자를 초과한 메시지는 VALIDATION_ERROR를 던지고 저장하지 않는다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo();
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-1',
        userId: 'user-1',
        message: 'a'.repeat(301),
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });

    expect(chatRepo.createMessage).not.toHaveBeenCalled();
    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
  });

  it('채팅 전송 시 Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo({ findRoomById: vi.fn().mockResolvedValue(null) });
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-missing',
        userId: 'user-1',
        message: 'hello',
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });

    expect(chatRepo.createMessage).not.toHaveBeenCalled();
    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
  });

  it('채팅 전송 시 참여자가 아니면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo({ findMembership: vi.fn().mockResolvedValue(null) });
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-1',
        userId: 'user-1',
        message: 'hello',
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });

    expect(chatRepo.createMessage).not.toHaveBeenCalled();
    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
  });

  it('채팅 전송 시 이미 나간 참여자면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo({
      findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'left' }),
    });
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.sendMessage({
        roomId: 'room-1',
        userId: 'user-1',
        message: 'hello',
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });

    expect(chatRepo.createMessage).not.toHaveBeenCalled();
    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
  });

  it('Room이 존재하면 채팅 내역과 hasMore false를 반환한다', async () => {
    const chatRepo = makeChatRepo({ findChatsByCursor: vi.fn().mockResolvedValue([chat]) });
    const roomRepo = makeRoomRepo();
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.getChats({
        roomId: 'room-1',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 2,
        userId: 'user-1',
      }),
    ).resolves.toEqual({ chats: [chat], hasMore: false });

    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
    expect(chatRepo.findChatsByCursor).toHaveBeenCalledWith({
      roomId: 'room-1',
      cursorTime: new Date('2026-07-01T12:00:00.000Z'),
      cursorId: 'message-cursor',
      limit: 3,
    });
  });

  it('조회 결과가 limit보다 많으면 마지막 행을 제거하고 hasMore true를 반환한다', async () => {
    const secondChat = { ...chat, id: 'message-2' };
    const thirdChat = { ...chat, id: 'message-3' };
    const chatRepo = makeChatRepo({
      findChatsByCursor: vi.fn().mockResolvedValue([chat, secondChat, thirdChat]),
    });
    const service = new ChatService(chatRepo, makeRoomRepo());

    await expect(
      service.getChats({
        roomId: 'room-1',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 2,
        userId: 'user-1',
      }),
    ).resolves.toEqual({ chats: [chat, secondChat], hasMore: true });
  });

  it('limit 미전달 시 기본값 50을 사용한다', async () => {
    const chatRepo = makeChatRepo();
    const service = new ChatService(chatRepo, makeRoomRepo());

    await service.getChats({
      roomId: 'room-1',
      cursorTime: '2026-07-01T12:00:00.000Z',
      cursorId: 'message-cursor',
      userId: 'user-1',
    });

    expect(chatRepo.findChatsByCursor).toHaveBeenCalledWith(expect.objectContaining({ limit: 51 }));
  });

  it('limit 전달 시 해당 값을 사용한다', async () => {
    const chatRepo = makeChatRepo();
    const service = new ChatService(chatRepo, makeRoomRepo());

    await service.getChats({
      roomId: 'room-1',
      cursorTime: '2026-07-01T12:00:00.000Z',
      cursorId: 'message-cursor',
      limit: 20,
      userId: 'user-1',
    });

    expect(chatRepo.findChatsByCursor).toHaveBeenCalledWith(expect.objectContaining({ limit: 21 }));
  });

  it('Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const service = new ChatService(
      chatRepo,
      makeRoomRepo({ findRoomById: vi.fn().mockResolvedValue(null) }),
    );

    await expect(
      service.getChats({
        roomId: 'room-missing',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 20,
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'ROOM_NOT_FOUND',
    });
    expect(chatRepo.findChatsByCursor).not.toHaveBeenCalled();
  });

  it('참여자가 아니면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const service = new ChatService(
      chatRepo,
      makeRoomRepo({ findMembership: vi.fn().mockResolvedValue(null) }),
    );

    await expect(
      service.getChats({
        roomId: 'room-1',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 20,
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(chatRepo.findChatsByCursor).not.toHaveBeenCalled();
  });

  it('cursorTime이 유효하지 않으면 VALIDATION_ERROR를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const roomRepo = makeRoomRepo();
    const service = new ChatService(chatRepo, roomRepo);

    await expect(
      service.getChats({
        roomId: 'room-1',
        cursorTime: 'not-a-date',
        cursorId: 'message-cursor',
        limit: 20,
        userId: 'user-1',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    expect(roomRepo.findRoomById).not.toHaveBeenCalled();
    expect(chatRepo.findChatsByCursor).not.toHaveBeenCalled();
  });

  it('Repository 에러를 그대로 전파한다', async () => {
    const error = new Error('db failed');
    const service = new ChatService(
      makeChatRepo({ findChatsByCursor: vi.fn().mockRejectedValue(error) }),
      makeRoomRepo(),
    );

    await expect(
      service.getChats({
        roomId: 'room-1',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 20,
        userId: 'user-1',
      }),
    ).rejects.toThrow(error);
  });
});
