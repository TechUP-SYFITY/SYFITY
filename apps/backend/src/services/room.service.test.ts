import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import type { PlaybackService } from './playback.service';
import { RoomService, type RoomSocketServer } from './room.service';
import type { ICache } from '../lib/cache/cache.interface';
import { getIo } from '../lib/io';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { PlaybackStateResult } from '../types/playback';
import type { IPlaylistRepository, PlaylistItemRecord } from '../types/playlist';
import type {
  IRoomRepository,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
  RoomUpdateRecord,
} from '../types/room';

vi.mock('../lib/io', () => ({
  getIo: vi.fn(() => {
    throw new Error('Socket.IO not initialized');
  }),
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
  updatedAt: new Date('2026-07-01T12:30:00.000Z'),
};

const playbackState: PlaybackStateResult = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  currentTime: 30,
  isPlaying: false,
  updatedAt: '2026-07-01T12:00:10.000Z',
};

type RoomPlaybackServiceMock = Pick<
  PlaybackService,
  'getPlaybackStateForJoin' | 'initializeCache' | 'clearCache'
>;

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
    upsertMembership: vi.fn().mockResolvedValue(undefined),
    findMembers: vi.fn().mockResolvedValue([member]),
    upsertRecentRoom: vi.fn().mockResolvedValue(undefined),
    updateMemberStatus: vi.fn().mockResolvedValue(true),
    findMemberInfo: vi.fn().mockResolvedValue(member),
    closeRoom: vi.fn().mockResolvedValue(undefined),
    updateRoomName: vi.fn().mockResolvedValue(updatedRoom),
    ...overrides,
  };
}

function makePlaybackService(
  overrides: Partial<RoomPlaybackServiceMock> = {},
): RoomPlaybackServiceMock {
  return {
    getPlaybackStateForJoin:
      overrides.getPlaybackStateForJoin ?? vi.fn().mockResolvedValue(playbackState),
    initializeCache: overrides.initializeCache ?? vi.fn(),
    clearCache: overrides.clearCache ?? vi.fn(),
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

function makeIo(): { io: RoomSocketServer; emitter: { emit: ReturnType<typeof vi.fn> } } {
  const emitter = { emit: vi.fn().mockReturnValue(true) };
  return {
    io: {
      to: vi.fn().mockReturnValue(emitter),
      socketsLeave: vi.fn(),
    },
    emitter,
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
    const { service, roomRepo, playbackService } = makeService({
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
    expect(playbackService.initializeCache).not.toHaveBeenCalled();
  });

  it('Room 생성 성공 시 PlaybackState 캐시 초기화를 위임한다', async () => {
    const { service, playbackService } = makeService();

    await service.createRoom('user-1', 'Morning Jazz');

    expect(playbackService.initializeCache).toHaveBeenCalledWith('room-1');
  });

  it('inviteCode로 Room에 입장하고 응답 데이터를 조합한다', async () => {
    const { service, roomRepo, playlistRepo, chatRepo, playbackService } = makeService();

    await expect(service.joinRoom('user-2', 'ABC123')).resolves.toEqual({
      room: roomDetail,
      playbackState: {
        videoId: 'video-1',
        playlistItemId: 'playlist-item-1',
        currentTime: 30,
        isPlaying: false,
        updatedAt: '2026-07-01T12:00:10.000Z',
      },
      playlist: [playlistItem],
      members: [member],
      recentChats: [chat],
    });
    expect(roomRepo.findRoomByInviteCode).toHaveBeenCalledWith('ABC123');
    expect(roomRepo.upsertMembership).toHaveBeenCalledWith('room-1', 'user-2');
    expect(roomRepo.upsertRecentRoom).toHaveBeenCalledWith('user-2', 'room-1');
    expect(playbackService.getPlaybackStateForJoin).toHaveBeenCalledWith('room-1');
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembers).toHaveBeenCalledWith('room-1');
    expect(chatRepo.findLatestChats).toHaveBeenCalledWith('room-1', 50);
  });

  it('inviteCode 입장은 기존 멤버십 상태를 조회하지 않고 upsert로 처리한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.joinRoom('user-2', 'ABC123')).resolves.toMatchObject({ room: roomDetail });
    expect(roomRepo.findMembership).not.toHaveBeenCalled();
    expect(roomRepo.upsertMembership).toHaveBeenCalledWith('room-1', 'user-2');
  });

  it('잘못된 inviteCode면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: { findRoomByInviteCode: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.joinRoom('user-2', 'BADCODE')).rejects.toMatchObject({
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

    await expect(service.joinRoom('user-2', 'ABC123')).rejects.toMatchObject({
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

    await expect(service.joinRoom('user-2', 'ABC123')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_INACTIVE,
    });
    expect(roomRepo.upsertMembership).not.toHaveBeenCalled();
  });

  it('PlaybackState 조회 실패는 그대로 전파한다', async () => {
    const error = Object.assign(new Error('missing playback state'), {
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
    const { service } = makeService({
      playbackService: makePlaybackService({
        getPlaybackStateForJoin: vi.fn().mockRejectedValue(error),
      }),
    });

    await expect(service.joinRoom('user-2', 'ABC123')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
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

    await expect(service.updateRoom('room-1', 'user-1', 'Evening Jazz')).resolves.toEqual(
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
      service.updateRoom('missing-room', 'user-1', 'Evening Jazz'),
    ).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.updateRoomName).not.toHaveBeenCalled();
  });

  it('Host가 아닌 사용자가 Room 이름을 수정하려 하면 AUTH_FORBIDDEN을 던진다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.updateRoom('room-1', 'user-2', 'Evening Jazz')).rejects.toMatchObject({
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

    await expect(service.updateRoom('room-1', 'user-1', 'Evening Jazz')).resolves.toEqual(
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

    await expect(service.updateRoom('room-1', 'user-1', 'Evening Jazz')).resolves.toEqual(
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
    expect(playbackService.clearCache).toHaveBeenCalledWith('room-1');
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

    await expect(service.closeRoom('room-1', 'user-1')).resolves.toEqual(roomDetail);

    expect(roomRepo.closeRoom).toHaveBeenCalledWith('room-1');
    expect(playbackService.clearCache).toHaveBeenCalledWith('room-1');
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { service } = makeService({
      chatRepo: { createMessage: vi.fn().mockRejectedValue(new Error('db failed')) },
    });

    await expect(
      service.createSystemMessage('room-1', 'Room이 종료되었습니다.'),
    ).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledWith(
      '[RoomService.createSystemMessage] 시스템 메시지 생성 실패',
      expect.any(Error),
    );
    consoleError.mockRestore();
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
    const { io, emitter } = makeIo();
    const { service, roomRepo, chatRepo, playbackService } = makeService({ io });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).resolves.toBeUndefined();

    expect(roomRepo.closeRoom).toHaveBeenCalledWith('room-1');
    expect(playbackService.clearCache).toHaveBeenCalledWith('room-1');
    expect(io.to).toHaveBeenCalledWith('room:room-1');
    expect(chatRepo.createMessage).toHaveBeenCalledWith({
      roomId: 'room-1',
      userId: null,
      type: 'system',
      message: 'Room이 종료되었습니다.',
    });
    expect(emitter.emit).toHaveBeenCalledWith('chat:system', {
      id: 'message-system',
      type: 'system',
      message: 'Room이 종료되었습니다.',
      createdAt: '2026-07-01T12:30:00.000Z',
    });
    expect(emitter.emit).toHaveBeenCalledWith('room:closed', {
      roomId: 'room-1',
      reason: 'host-closed',
    });
    const systemCallOrder = emitter.emit.mock.invocationCallOrder[0];
    const closedCallOrder = emitter.emit.mock.invocationCallOrder[1];
    expect(systemCallOrder).toBeLessThan(closedCallOrder);
    expect(io.socketsLeave).toHaveBeenCalledWith('room:room-1');
  });

  it('REST Room 종료 시 시스템 메시지 생성 실패에도 room:closed를 broadcast한다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { io, emitter } = makeIo();
    const { service } = makeService({
      io,
      chatRepo: { createMessage: vi.fn().mockRejectedValue(new Error('db failed')) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).resolves.toBeUndefined();

    expect(emitter.emit).not.toHaveBeenCalledWith('chat:system', expect.anything());
    expect(emitter.emit).toHaveBeenCalledWith('room:closed', {
      roomId: 'room-1',
      reason: 'host-closed',
    });
    expect(io.socketsLeave).toHaveBeenCalledWith('room:room-1');
    consoleError.mockRestore();
  });

  it('REST Room 종료 시 Room이 없으면 broadcast하지 않는다', async () => {
    const { io, emitter } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.closeRoomAndBroadcast('missing-room', 'user-1')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 참여자가 아니면 ROOM_ACCESS_DENIED를 던지고 broadcast하지 않는다', async () => {
    const { io, emitter } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findMembership: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 이미 나간 참여자면 ROOM_ACCESS_DENIED를 던지고 broadcast하지 않는다', async () => {
    const { io, emitter } = makeIo();
    const { service, roomRepo } = makeService({
      io,
      roomRepo: { findMembership: vi.fn().mockResolvedValue({ role: 'host', status: 'left' }) },
    });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-1')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.ROOM_ACCESS_DENIED,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
    expect(io.socketsLeave).not.toHaveBeenCalled();
  });

  it('REST Room 종료 시 Host가 아니면 AUTH_FORBIDDEN을 던지고 broadcast하지 않는다', async () => {
    const { io, emitter } = makeIo();
    const { service, roomRepo } = makeService({ io });

    await expect(service.closeRoomAndBroadcast('room-1', 'user-2')).rejects.toMatchObject({
      status: 403,
      code: ERROR_CODES.AUTH_FORBIDDEN,
    });
    expect(roomRepo.closeRoom).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
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
