import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import { RoomService } from './room.service';
import type { ICache } from '../lib/cache/cache.interface';
import { getIo } from '../lib/io';
import { logger } from '../lib/logger';
import { broadcastToRoom } from '../socket/broadcast';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { IPlaylistRepository, PlaylistItemRecord } from '../types/playlist';
import type {
  IRoomRepository,
  KickedMemberRecord,
  RoomDetailRecord,
  RoomMemberLookupRecord,
  RoomMemberRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';

vi.mock('../lib/io', () => ({
  getIo: vi.fn(() => {
    throw new Error('Socket.IO not initialized');
  }),
}));

vi.mock('../socket/broadcast', () => ({
  broadcastToRoom: vi.fn(),
}));

const room: RoomRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

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
  status: 'active',
  closedAt: null,
  updatedAt: new Date('2026-07-01T12:30:00.000Z'),
};

type RoomPlaybackServiceMock = Pick<PlaybackService, 'clearSession'>;

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

const systemChat: ChatRecord = {
  id: 'message-system',
  userId: null,
  nickname: null,
  profileImage: null,
  type: 'system',
  message: 'Room이 종료되었습니다.',
  createdAt: new Date('2026-07-01T12:30:00.000Z'),
};

function makeRepo(overrides: Partial<IRoomRepository> = {}): IRoomRepository {
  return {
    existsInviteCode: vi.fn().mockResolvedValue(false),
    createRoom: vi.fn().mockResolvedValue(room),
    existsRoom: vi.fn().mockResolvedValue(true),
    findRoomById: vi.fn().mockResolvedValue(roomDetail),
    findRoomByInviteCode: vi.fn().mockResolvedValue(roomDetail),
    touchLastActivity: vi.fn().mockResolvedValue(undefined),
    findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'offline' }),
    upsertMembership: vi.fn().mockResolvedValue(true),
    findMembers: vi.fn().mockResolvedValue([member]),
    findMemberById: vi.fn().mockResolvedValue(null),
    updateMemberStatusByMemberId: vi.fn().mockResolvedValue(true),
    findKickedMembers: vi.fn().mockResolvedValue([]),
    upsertRecentRoom: vi.fn().mockResolvedValue(undefined),
    updateMemberStatus: vi.fn().mockResolvedValue(true),
    findMemberInfo: vi.fn().mockResolvedValue(member),
    closeRoom: vi
      .fn()
      .mockResolvedValue({ ...updatedRoom, status: 'closed', closedAt: new Date() }),
    updateRoomName: vi.fn().mockResolvedValue(updatedRoom),
    ...overrides,
  };
}

function makePlaybackService(
  overrides: Partial<RoomPlaybackServiceMock> = {},
): RoomPlaybackServiceMock {
  return {
    clearSession: overrides.clearSession ?? vi.fn(),
  };
}

function makePlaylistRepo(
  overrides: Partial<Pick<IPlaylistRepository, 'getPlaylist'>> = {},
): Pick<IPlaylistRepository, 'getPlaylist'> {
  return {
    getPlaylist: vi.fn().mockResolvedValue([playlistItem]),
    ...overrides,
  };
}

function makeChatRepo(
  overrides: Partial<Pick<IChatRepository, 'findLatestChats' | 'createMessage'>> = {},
): Pick<IChatRepository, 'findLatestChats' | 'createMessage'> {
  return {
    findLatestChats: vi.fn().mockResolvedValue([chat]),
    createMessage: vi.fn().mockResolvedValue(systemChat),
    ...overrides,
  };
}

function makeCache(): ICache {
  return {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    del: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  };
}

type RoomSocketServer = {
  socketsLeave: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

function makeIo(): { io: RoomSocketServer } {
  return {
    io: {
      socketsLeave: vi.fn(),
      in: vi.fn(),
    },
  };
}

function makeService(
  overrides: {
    roomRepo?: Partial<IRoomRepository>;
    playlistRepo?: Partial<Pick<IPlaylistRepository, 'getPlaylist'>>;
    chatRepo?: Partial<Pick<IChatRepository, 'findLatestChats' | 'createMessage'>>;
    playbackService?: ReturnType<typeof makePlaybackService>;
    cache?: ICache;
    io?: RoomSocketServer;
  } = {},
) {
  const roomRepo = makeRepo(overrides.roomRepo);
  const playlistRepo = makePlaylistRepo(overrides.playlistRepo);
  const chatRepo = makeChatRepo(overrides.chatRepo);
  const playbackService = overrides.playbackService ?? makePlaybackService();
  const cache = overrides.cache ?? makeCache();

  if (overrides.io) {
    const io = overrides.io;
    vi.mocked(getIo).mockReturnValue(io as never);
  }

  return {
    service: new RoomService(roomRepo, cache, playlistRepo, chatRepo, playbackService),
    roomRepo,
    playlistRepo,
    chatRepo,
    playbackService,
    cache,
  };
}

describe('RoomService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(broadcastToRoom).mockClear();
    vi.mocked(getIo).mockImplementation(() => {
      throw new Error('Socket.IO not initialized');
    });
  });

  it('첫 번째 시도에 고유 초대 코드를 생성하고 Room을 생성한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(roomRepo.existsInviteCode).toHaveBeenCalledTimes(1);
    expect(roomRepo.existsInviteCode).toHaveBeenCalledWith(expect.stringMatching(/^[0-9A-F]{6}$/));
    expect(roomRepo.createRoom).toHaveBeenCalledWith({
      name: 'Morning Jazz',
      hostId: 'user-1',
      inviteCode: expect.stringMatching(/^[0-9A-F]{6}$/),
    });
    expect(roomRepo.upsertRecentRoom).toHaveBeenCalledWith('user-1', 'room-1');
  });

  it('1회 중복 후 2회차 초대 코드로 Room을 생성한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        existsInviteCode: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      },
    });

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(roomRepo.existsInviteCode).toHaveBeenCalledTimes(2);
    expect(roomRepo.createRoom).toHaveBeenCalledTimes(1);
  });

  it('2회 중복 후 3회차 초대 코드로 Room을 생성한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        existsInviteCode: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
      },
    });

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(roomRepo.existsInviteCode).toHaveBeenCalledTimes(3);
    expect(roomRepo.createRoom).toHaveBeenCalledTimes(1);
  });

  it('3회 모두 중복이면 초대 코드 생성 실패 에러를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        existsInviteCode: vi.fn().mockResolvedValue(true),
      },
    });

    await expect(service.createRoom('user-1', 'Morning Jazz')).rejects.toMatchObject({
      status: 500,
      code: 'SERVER_INVITE_CODE_GENERATION_FAILED',
    });
    expect(roomRepo.existsInviteCode).toHaveBeenCalledTimes(3);
    expect(roomRepo.createRoom).not.toHaveBeenCalled();
  });

  it('Room 생성은 인메모리 재생 세션을 미리 만들지 않는다', async () => {
    const { service } = makeService();

    await service.createRoom('user-1', 'Morning Jazz');
  });

  it('inviteCode로 Room 멤버십을 만들고 영속 데이터만 반환한다', async () => {
    const { service, roomRepo, playlistRepo, chatRepo } = makeService();

    await expect(service.createMembership('user-2', 'ABC123')).resolves.toEqual({
      room: roomDetail,
      isNewMembership: true,
    });
    expect(roomRepo.findRoomByInviteCode).toHaveBeenCalledWith('ABC123');
    expect(roomRepo.upsertMembership).toHaveBeenCalledWith('room-1', 'user-2');
    expect(roomRepo.upsertRecentRoom).toHaveBeenCalledWith('user-2', 'room-1');
    expect(playlistRepo.getPlaylist).not.toHaveBeenCalled();
    expect(roomRepo.findMembers).not.toHaveBeenCalled();
    expect(chatRepo.findLatestChats).not.toHaveBeenCalled();
  });

  it('Room snapshot은 Socket 전용 데이터를 조합한다', async () => {
    const { service, playlistRepo, roomRepo, chatRepo } = makeService();

    await expect(service.getRoomSnapshot('room-1')).resolves.toEqual({
      playlist: [playlistItem],
      members: [member],
      recentChats: [chat],
    });
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembers).toHaveBeenCalledWith('room-1');
    expect(chatRepo.findLatestChats).toHaveBeenCalledWith('room-1', 50);
  });

  it('멤버십 생성은 기존 상태를 확인한 뒤 upsert로 처리한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.createMembership('user-2', 'ABC123')).resolves.toMatchObject({
      room: roomDetail,
    });
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-2');
    expect(roomRepo.upsertMembership).toHaveBeenCalledWith('room-1', 'user-2');
  });

  it('추방된 멤버십은 재입장을 ROOM_MEMBER_KICKED로 거부한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'kicked' }),
      },
    });

    await expect(service.createMembership('user-2', 'ABC123')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_MEMBER_KICKED,
    });
    expect(roomRepo.upsertMembership).not.toHaveBeenCalled();
    expect(roomRepo.upsertRecentRoom).not.toHaveBeenCalled();
  });

  it('잘못된 inviteCode면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findRoomByInviteCode: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.createMembership('user-2', 'BADCODE')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.upsertMembership).not.toHaveBeenCalled();
  });

  it('closed Room이면 ROOM_CLOSED를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findRoomByInviteCode: vi.fn().mockResolvedValue({ ...roomDetail, status: 'closed' }),
      },
    });

    await expect(service.createMembership('user-2', 'ABC123')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_CLOSED,
    });
    expect(roomRepo.upsertMembership).not.toHaveBeenCalled();
  });

  it('inactive Room이면 ROOM_INACTIVE를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findRoomByInviteCode: vi.fn().mockResolvedValue({ ...roomDetail, status: 'inactive' }),
      },
    });

    await expect(service.createMembership('user-2', 'ABC123')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_INACTIVE,
    });
    expect(roomRepo.upsertMembership).not.toHaveBeenCalled();
  });

  it('Room 기본 정보를 조회한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.getRoomInfo('room-1', 'user-1')).resolves.toEqual(roomDetail);
    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('left 상태 멤버도 Room 기본 정보를 조회할 수 있다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'left' }),
      },
    });

    await expect(service.getRoomInfo('room-1', 'user-1')).resolves.toEqual(roomDetail);
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('Room 기본 정보가 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getRoomInfo('missing-room', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
  });

  it('Room 멤버십 이력이 없으면 기본 정보 조회에서 ROOM_ACCESS_DENIED를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findMembership: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getRoomInfo('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
  });

  it('Host가 Room 이름을 수정하면 갱신된 정보를 반환한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.updateRoom('room-1', 'user-1', { name: 'Evening Jazz' })).resolves.toEqual(
      updatedRoom,
    );

    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.updateRoomName).toHaveBeenCalledWith('room-1', 'Evening Jazz');
  });

  it('Room 이름 수정 시 Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      service.updateRoom('missing-room', 'user-1', { name: 'Evening Jazz' }),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.updateRoomName).not.toHaveBeenCalled();
  });

  it('Host가 아닌 사용자가 Room 이름을 수정하려 하면 AUTH_FORBIDDEN을 던진다', async () => {
    const { service, roomRepo } = makeService();

    await expect(
      service.updateRoom('room-1', 'user-2', { name: 'Evening Jazz' }),
    ).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(roomRepo.updateRoomName).not.toHaveBeenCalled();
  });

  it('closed Room도 Host면 이름 수정을 허용한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findRoomById: vi.fn().mockResolvedValue({ ...roomDetail, status: 'closed' }),
      },
    });

    await expect(service.updateRoom('room-1', 'user-1', { name: 'Evening Jazz' })).resolves.toEqual(
      updatedRoom,
    );
    expect(roomRepo.updateRoomName).toHaveBeenCalledWith('room-1', 'Evening Jazz');
  });

  it('inactive Room도 Host면 이름 수정을 허용한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findRoomById: vi.fn().mockResolvedValue({ ...roomDetail, status: 'inactive' }),
      },
    });

    await expect(service.updateRoom('room-1', 'user-1', { name: 'Evening Jazz' })).resolves.toEqual(
      updatedRoom,
    );
    expect(roomRepo.updateRoomName).toHaveBeenCalledWith('room-1', 'Evening Jazz');
  });

  it('멤버를 online으로 전환하고 멤버 정보를 반환한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.setMemberOnline('room-1', 'user-1')).resolves.toEqual({
      member,
      wasOnline: false,
    });

    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembership).toHaveBeenCalledWith('room-1', 'user-1');
    expect(roomRepo.updateMemberStatus).toHaveBeenCalledWith('room-1', 'user-1', 'online', [
      'offline',
    ]);
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMemberInfo).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('이미 online 상태라 전환이 일어나지 않으면 wasOnline true를 반환한다', async () => {
    const { service } = makeService({
      roomRepo: {
        updateMemberStatus: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(service.setMemberOnline('room-1', 'user-1')).resolves.toEqual({
      member,
      wasOnline: true,
    });
  });

  it('Room 참여자 목록 조회를 repository에 위임한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.getMembers('room-1')).resolves.toEqual([member]);

    expect(roomRepo.findMembers).toHaveBeenCalledWith('room-1');
  });

  it('Host는 활성 멤버와 추방 멤버 목록을 각각 조회할 수 있다', async () => {
    const kickedMember: KickedMemberRecord = {
      id: 'member-2',
      userId: 'user-2',
      nickname: 'Bob',
      profileImage: null,
      kickedAt: new Date('2026-07-01T13:00:00.000Z'),
    };
    const { service, roomRepo } = makeService({
      roomRepo: { findKickedMembers: vi.fn().mockResolvedValue([kickedMember]) },
    });

    await expect(service.getActiveMembers('room-1', 'user-1')).resolves.toEqual([member]);
    await expect(service.getKickedMembers('room-1', 'user-1')).resolves.toEqual([kickedMember]);
    expect(roomRepo.findMembers).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findKickedMembers).toHaveBeenCalledWith('room-1');
  });

  it('Host가 멤버를 추방하면 대상 Socket을 해제하고 presence:update를 전파한다', async () => {
    const target: RoomMemberLookupRecord = {
      id: 'member-2',
      userId: 'user-2',
      nickname: 'Bob',
      profileImage: null,
      role: 'member',
      status: 'online',
    };
    const targetSocket = {
      data: { userId: 'user-2' },
      emit: vi.fn(),
      leave: vi.fn().mockResolvedValue(undefined),
    };
    const otherSocket = {
      data: { userId: 'user-3' },
      emit: vi.fn(),
      leave: vi.fn(),
    };
    const { io } = makeIo();
    io.in.mockReturnValue({ fetchSockets: vi.fn().mockResolvedValue([targetSocket, otherSocket]) });
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findMemberById: vi.fn().mockResolvedValue(target) },
    });

    await expect(service.kickMember('room-1', 'user-1', 'member-2')).resolves.toEqual({
      memberId: 'member-2',
      status: 'kicked',
    });
    expect(roomRepo.updateMemberStatusByMemberId).toHaveBeenCalledWith(
      'room-1',
      'member-2',
      'kicked',
      ['online', 'offline'],
    );
    expect(targetSocket.emit).toHaveBeenCalledWith('room:kicked', {
      roomId: 'room-1',
      message: 'Host에 의해 Room에서 추방되었습니다.',
    });
    expect(targetSocket.leave).toHaveBeenCalledWith('room:room-1');
    expect(otherSocket.emit).not.toHaveBeenCalled();
    expect(otherSocket.leave).not.toHaveBeenCalled();
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'presence:update', {
      userId: 'user-2',
      nickname: 'Bob',
      profileImage: null,
      role: 'member',
      status: 'left',
    });
  });

  it('Host 자신 추방과 이미 추방된 멤버의 재추방을 거부한다', async () => {
    const host = { ...member, status: 'online' } satisfies RoomMemberLookupRecord;
    const { service, roomRepo } = makeService({
      roomRepo: { findMemberById: vi.fn().mockResolvedValue(host) },
    });

    await expect(service.kickMember('room-1', 'user-1', 'member-1')).rejects.toMatchObject({
      status: 409,
      code: ERROR_CODES.ROOM_CANNOT_KICK_HOST,
    });
    expect(roomRepo.updateMemberStatusByMemberId).not.toHaveBeenCalled();
  });

  it('추방 해제는 kicked 상태만 left로 전환하고 Socket 이벤트를 내보내지 않는다', async () => {
    const target: RoomMemberLookupRecord = {
      id: 'member-2',
      userId: 'user-2',
      nickname: 'Bob',
      profileImage: null,
      role: 'member',
      status: 'kicked',
    };
    const { service, roomRepo } = makeService({
      roomRepo: { findMemberById: vi.fn().mockResolvedValue(target) },
    });

    await expect(service.unkickMember('room-1', 'user-1', 'member-2')).resolves.toEqual({
      memberId: 'member-2',
      status: 'left',
    });
    expect(roomRepo.updateMemberStatusByMemberId).toHaveBeenCalledWith(
      'room-1',
      'member-2',
      'left',
      ['kicked'],
    );
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });

  it('추방 상태가 아닌 멤버의 해제를 ROOM_MEMBER_NOT_KICKED로 거부한다', async () => {
    const target: RoomMemberLookupRecord = {
      id: 'member-2',
      userId: 'user-2',
      nickname: 'Bob',
      profileImage: null,
      role: 'member',
      status: 'offline',
    };
    const { service } = makeService({
      roomRepo: {
        findMemberById: vi.fn().mockResolvedValue(target),
        updateMemberStatusByMemberId: vi.fn().mockResolvedValue(false),
      },
    });

    await expect(service.unkickMember('room-1', 'user-1', 'member-2')).rejects.toMatchObject({
      status: 409,
      code: ERROR_CODES.ROOM_MEMBER_NOT_KICKED,
    });
  });

  it('online 전환 시 Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.setMemberOnline('missing-room', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.updateMemberStatus).not.toHaveBeenCalled();
  });

  it('online 전환 시 참여자가 아니거나 이미 나간 사용자면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'left' }) },
    });

    await expect(service.setMemberOnline('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.updateMemberStatus).not.toHaveBeenCalled();
  });

  it('online 전환 후 멤버 정보 재조회에 실패하면 SERVER_INTERNAL_ERROR를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findMemberInfo: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.setMemberOnline('room-1', 'user-1')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
  });

  it('일반 멤버가 Room을 나가면 left로 전환하고 멤버 정보를 반환한다', async () => {
    const leftMember = { ...member, userId: 'user-2', status: 'left' as const };
    const { service, roomRepo } = makeService({
      roomRepo: { findMemberInfo: vi.fn().mockResolvedValue(leftMember) },
    });

    await expect(service.leaveRoom('room-1', 'user-2')).resolves.toEqual({
      type: 'left',
      member: leftMember,
    });

    expect(roomRepo.updateMemberStatus).toHaveBeenCalledWith('room-1', 'user-2', 'left', [
      'online',
      'offline',
    ]);
    expect(roomRepo.touchLastActivity).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMemberInfo).toHaveBeenCalledWith('room-1', 'user-2');
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
  });

  it('이미 나간 상태로 전환이 일어나지 않으면 noop을 반환하고 시스템 메시지용 조회를 하지 않는다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { updateMemberStatus: vi.fn().mockResolvedValue(false) },
    });

    await expect(service.leaveRoom('room-1', 'user-2')).resolves.toEqual({ type: 'noop' });

    expect(roomRepo.touchLastActivity).not.toHaveBeenCalled();
    expect(roomRepo.findMemberInfo).not.toHaveBeenCalled();
  });

  it('Host가 Room을 나가면 Room을 종료한다', async () => {
    const { service, roomRepo, playbackService } = makeService();

    await expect(service.leaveRoom('room-1', 'user-1')).resolves.toEqual({ type: 'closed' });

    expect(roomRepo.closeRoom).toHaveBeenCalledWith('room-1');
    expect(playbackService.clearSession).toHaveBeenCalledWith('room-1');
    expect(roomRepo.updateMemberStatus).not.toHaveBeenCalled();
  });

  it('Room 퇴장 시 참여자가 아니면 ROOM_ACCESS_DENIED를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findMembership: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.leaveRoom('room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.updateMemberStatus).not.toHaveBeenCalled();
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
  });

  it('일반 멤버 퇴장 후 멤버 정보 재조회에 실패하면 SERVER_INTERNAL_ERROR를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findMemberInfo: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.leaveRoom('room-1', 'user-2')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
  });

  it('Host가 Room을 닫으면 Room 종료와 캐시 삭제 후 Room 정보를 반환한다', async () => {
    const { service, roomRepo, playbackService } = makeService();

    await expect(service.closeRoom('room-1', 'user-1')).resolves.toMatchObject({
      status: 'closed',
    });

    expect(roomRepo.closeRoom).toHaveBeenCalledWith('room-1');
    expect(playbackService.clearSession).toHaveBeenCalledWith('room-1');
  });

  it('시스템 메시지를 저장하고 결과를 반환한다', async () => {
    const { service, chatRepo } = makeService();

    await expect(service.createSystemMessage('room-1', 'Room이 종료되었습니다.')).resolves.toEqual(
      systemChat,
    );

    expect(chatRepo.createMessage).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: null,
      type: 'system',
      message: 'Room이 종료되었습니다.',
    });
  });

  it('시스템 메시지 저장 실패는 null을 반환하고 에러를 전파하지 않는다', async () => {
    const loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { service } = makeService({
      chatRepo: { createMessage: vi.fn().mockRejectedValue(new Error('db failed')) },
    });

    await expect(
      service.createSystemMessage('room-1', 'Room이 종료되었습니다.'),
    ).resolves.toBeNull();

    expect(loggerError).toHaveBeenCalledWith(
      { err: expect.any(Error), roomId: 'room-1' },
      '[RoomService.createSystemMessage] 시스템 메시지 생성 실패',
    );
    loggerError.mockRestore();
  });

  it('Host가 아닌 사용자가 Room을 닫으려 하면 AUTH_FORBIDDEN을 던진다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.closeRoom('room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
  });

  it('Room 종료 시 Room이 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.closeRoom('missing-room', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
  });

  it('REST Room 종료 성공 시 chat:system과 room:closed를 broadcast하고 Socket Room을 해제한다', async () => {
    const { io } = makeIo();
    const { service, roomRepo, chatRepo, playbackService } = makeService({ io });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).resolves.toMatchObject({
      status: 'closed',
    });

    expect(roomRepo.closeRoom).toHaveBeenCalledWith('room-1');
    expect(playbackService.clearSession).toHaveBeenCalledWith('room-1');
    expect(chatRepo.createMessage).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: null,
      type: 'system',
      message: 'Room이 종료되었습니다.',
    });
    expect(broadcastToRoom).toHaveBeenNthCalledWith(1, 'room-1', 'chat:system', {
      id: 'message-system',
      userId: null,
      nickname: null,
      profileImage: null,
      type: 'system',
      message: 'Room이 종료되었습니다.',
      createdAt: '2026-07-01T12:30:00.000Z',
    });
    expect(broadcastToRoom).toHaveBeenNthCalledWith(2, 'room-1', 'room:closed', {
      roomId: 'room-1',
      reason: 'host-closed',
    });
    const systemCallOrder = vi.mocked(broadcastToRoom).mock.invocationCallOrder[0];
    const closedCallOrder = vi.mocked(broadcastToRoom).mock.invocationCallOrder[1];
    expect(systemCallOrder).toBeLessThan(closedCallOrder);
    expect(io.socketsLeave).toHaveBeenCalledWith('room:room-1');
  });

  it('REST Room 종료 시 시스템 메시지 생성 실패에도 room:closed를 broadcast한다', async () => {
    const loggerError = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { io } = makeIo();
    const { service } = makeService({
      io,
      chatRepo: { createMessage: vi.fn().mockRejectedValue(new Error('db failed')) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).resolves.toMatchObject({
      status: 'closed',
    });

    expect(broadcastToRoom).not.toHaveBeenCalledWith('room-1', 'chat:system', expect.anything());
    expect(broadcastToRoom).toHaveBeenCalledWith('room-1', 'room:closed', {
      roomId: 'room-1',
      reason: 'host-closed',
    });
    expect(io.socketsLeave).toHaveBeenCalledWith('room:room-1');
    loggerError.mockRestore();
  });

  it('REST Room 종료 시 Room이 없으면 broadcast하지 않는다', async () => {
    const { io } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.closeRoomAndBroadcast('missing-room', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 참여자가 아니면 ROOM_ACCESS_DENIED를 던지고 broadcast하지 않는다', async () => {
    const { io } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findMembership: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 이미 나간 참여자면 ROOM_ACCESS_DENIED를 던지고 broadcast하지 않는다', async () => {
    const { io } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findMembership: vi.fn().mockResolvedValue({ role: 'host', status: 'left' }) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 Host가 아니면 AUTH_FORBIDDEN을 던지고 broadcast하지 않는다', async () => {
    const { io } = makeIo();
    const { service, roomRepo } = makeService({ io });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 Socket.IO가 초기화되지 않았으면 에러를 던지고 Room을 닫지 않는다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).rejects.toThrow(
      'Socket.IO not initialized',
    );
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
  });
});
