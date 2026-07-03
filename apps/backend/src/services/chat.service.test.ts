import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { ChatService } from './chat.service';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { IRoomRepository, RoomRecord } from '../types/room';

const chat: ChatRecord = {
  id: 'message-1',
  userId: 'user-1',
  nickname: 'Alice',
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T11:59:00.000Z'),
};

const room: RoomRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

function makeChatRepo(overrides: Partial<IChatRepository> = {}): IChatRepository {
  return {
    findChatsByCursor: vi.fn().mockResolvedValue([chat]),
    ...overrides,
  };
}

function makeRoomRepo(overrides: Partial<IRoomRepository> = {}): IRoomRepository {
  return {
    existsInviteCode: vi.fn().mockResolvedValue(false),
    createRoom: vi.fn().mockResolvedValue(room),
    existsRoom: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('ChatService', () => {
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
      }),
    ).resolves.toEqual({ chats: [chat], hasMore: false });

    expect(roomRepo.existsRoom).toHaveBeenCalledWith('room-1');
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
    });

    expect(chatRepo.findChatsByCursor).toHaveBeenCalledWith(expect.objectContaining({ limit: 21 }));
  });

  it('Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const chatRepo = makeChatRepo();
    const service = new ChatService(
      chatRepo,
      makeRoomRepo({ existsRoom: vi.fn().mockResolvedValue(false) }),
    );

    await expect(
      service.getChats({
        roomId: 'room-missing',
        cursorTime: '2026-07-01T12:00:00.000Z',
        cursorId: 'message-cursor',
        limit: 20,
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'ROOM_NOT_FOUND',
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
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
    });
    expect(roomRepo.existsRoom).not.toHaveBeenCalled();
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
      }),
    ).rejects.toThrow(error);
  });
});
