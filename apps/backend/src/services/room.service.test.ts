import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@syfity/shared';

import { RoomService } from './room.service';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { ChatRecord, IChatRepository } from '../types/chat';
import type { IPlaylistRepository, PlaylistItemRecord } from '../types/playlist';
import type {
  IRoomRepository,
  PlaybackStateRecord,
  RoomDetailRecord,
  RoomMemberRecord,
  RoomRecord,
} from '../types/room';

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

const playbackState: PlaybackStateRecord = {
  videoId: 'video-1',
  playlistItemId: 'playlist-item-1',
  baseCurrentTime: 30,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: new Date('2026-07-01T12:00:05.000Z'),
  updatedAt: new Date('2026-07-01T12:00:10.000Z'),
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
  type: 'user',
  message: 'hello',
  createdAt: new Date('2026-07-01T11:59:00.000Z'),
};

const initialPlaybackState = {
  videoId: null,
  playlistItemId: null,
  baseCurrentTime: 0,
  isPlaying: false,
  serverStartedAt: null,
  serverPausedAt: null,
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
    findPlaybackState: vi.fn().mockResolvedValue(playbackState),
    ...overrides,
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
  overrides: Partial<Pick<IChatRepository, 'findLatestChats'>> = {},
): Pick<IChatRepository, 'findLatestChats'> {
  return {
    findLatestChats: vi.fn().mockResolvedValue([chat]),
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

function makeService(
  overrides: {
    roomRepo?: Partial<IRoomRepository>;
    playlistRepo?: Partial<Pick<IPlaylistRepository, 'getPlaylist'>>;
    chatRepo?: Partial<Pick<IChatRepository, 'findLatestChats'>>;
    cache?: ICache;
  } = {},
) {
  const roomRepo = makeRepo(overrides.roomRepo);
  const playlistRepo = makePlaylistRepo(overrides.playlistRepo);
  const chatRepo = makeChatRepo(overrides.chatRepo);
  const cache = overrides.cache ?? makeCache();

  return {
    service: new RoomService(roomRepo, cache, playlistRepo, chatRepo),
    roomRepo,
    playlistRepo,
    chatRepo,
    cache,
  };
}

describe('RoomService', () => {
  afterEach(() => {
    vi.useRealTimers();
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
    const { service, roomRepo, cache } = makeService({
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
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('Room 생성 성공 시 PlaybackState 초기값을 캐시에 저장한다', async () => {
    const { service, cache } = makeService();

    await service.createRoom('user-1', 'Morning Jazz');

    expect(cache.set).toHaveBeenCalledWith(CacheKeys.playbackState('room-1'), initialPlaybackState);
  });

  it('inviteCode로 Room에 입장하고 응답 데이터를 조합한다', async () => {
    const { service, roomRepo, playlistRepo, chatRepo } = makeService();

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
    expect(roomRepo.findPlaybackState).toHaveBeenCalledWith('room-1');
    expect(playlistRepo.getPlaylist).toHaveBeenCalledWith('room-1');
    expect(roomRepo.findMembers).toHaveBeenCalledWith('room-1');
    expect(chatRepo.findLatestChats).toHaveBeenCalledWith('room-1', 50);
  });

  it('left 상태 이력이 있어도 inviteCode 입장은 upsert 흐름으로 허용한다', async () => {
    const { service, roomRepo } = makeService({
      roomRepo: {
        findMembership: vi.fn().mockResolvedValue({ role: 'member', status: 'left' }),
      },
    });

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

  it('PlaybackState가 없으면 SERVER_INTERNAL_ERROR를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findPlaybackState: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.joinRoom('user-2', 'ABC123')).rejects.toMatchObject({
      status: 500,
      code: ERROR_CODES.SERVER_INTERNAL_ERROR,
    });
  });

  it('재생 중이면 serverStartedAt 기준으로 currentTime을 역산한다', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:05.000Z'));
    const { service } = makeService({
      roomRepo: {
        findPlaybackState: vi.fn().mockResolvedValue({
          ...playbackState,
          baseCurrentTime: 30,
          isPlaying: true,
          serverStartedAt: new Date('2026-07-01T12:00:00.000Z'),
        }),
      },
    });

    await expect(service.joinRoom('user-2', 'ABC123')).resolves.toMatchObject({
      playbackState: { currentTime: 35 },
    });
  });

  it('Room 기본 정보를 조회한다', async () => {
    const { service, roomRepo } = makeService();

    await expect(service.getRoomInfo('room-1')).resolves.toEqual(roomDetail);
    expect(roomRepo.findRoomById).toHaveBeenCalledWith('room-1');
  });

  it('Room 기본 정보가 없으면 ROOM_NOT_FOUND를 던진다', async () => {
    const { service } = makeService({
      roomRepo: { findRoomById: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getRoomInfo('missing-room')).rejects.toMatchObject({
      status: 404,
      code: ERROR_CODES.ROOM_NOT_FOUND,
    });
  });
});
