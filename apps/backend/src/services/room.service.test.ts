import { describe, expect, it, vi } from 'vitest';

import { RoomService } from './room.service';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { IRoomRepository, RoomRecord } from '../types/room';

const room: RoomRecord = {
  id: 'room-1',
  name: 'Morning Jazz',
  inviteCode: 'ABC123',
  status: 'active',
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
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

describe('RoomService', () => {
  it('첫 번째 시도에 고유 초대 코드를 생성하고 Room을 생성한다', async () => {
    const repo = makeRepo();
    const cache = makeCache();
    const service = new RoomService(repo, cache);

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(repo.existsInviteCode).toHaveBeenCalledTimes(1);
    expect(repo.existsInviteCode).toHaveBeenCalledWith(expect.stringMatching(/^[0-9A-F]{6}$/));
    expect(repo.createRoom).toHaveBeenCalledWith({
      name: 'Morning Jazz',
      hostId: 'user-1',
      inviteCode: expect.stringMatching(/^[0-9A-F]{6}$/),
    });
  });

  it('1회 중복 후 2회차 초대 코드로 Room을 생성한다', async () => {
    const repo = makeRepo({
      existsInviteCode: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    });
    const cache = makeCache();
    const service = new RoomService(repo, cache);

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(repo.existsInviteCode).toHaveBeenCalledTimes(2);
    expect(repo.createRoom).toHaveBeenCalledTimes(1);
  });

  it('2회 중복 후 3회차 초대 코드로 Room을 생성한다', async () => {
    const repo = makeRepo({
      existsInviteCode: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    });
    const cache = makeCache();
    const service = new RoomService(repo, cache);

    await expect(service.createRoom('user-1', 'Morning Jazz')).resolves.toEqual(room);

    expect(repo.existsInviteCode).toHaveBeenCalledTimes(3);
    expect(repo.createRoom).toHaveBeenCalledTimes(1);
  });

  it('3회 모두 중복이면 초대 코드 생성 실패 에러를 던진다', async () => {
    const repo = makeRepo({
      existsInviteCode: vi.fn().mockResolvedValue(true),
    });
    const cache = makeCache();
    const service = new RoomService(repo, cache);

    await expect(service.createRoom('user-1', 'Morning Jazz')).rejects.toMatchObject({
      status: 500,
      code: 'SERVER_INVITE_CODE_GENERATION_FAILED',
    });
    expect(repo.existsInviteCode).toHaveBeenCalledTimes(3);
    expect(repo.createRoom).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('Room 생성 성공 시 PlaybackState 초기값을 캐시에 저장한다', async () => {
    const repo = makeRepo();
    const cache = makeCache();
    const service = new RoomService(repo, cache);

    await service.createRoom('user-1', 'Morning Jazz');

    expect(cache.set).toHaveBeenCalledWith(CacheKeys.playbackState('room-1'), initialPlaybackState);
  });
});
