import { describe, expect, it, vi } from 'vitest';

import { UserService } from './user.service';
import type { IUserRepository, RecentRoomRecord, UserProfileRecord } from '../types/user';

const userProfile: UserProfileRecord = {
  id: 'user-id',
  email: 'alice@example.com',
  nickname: 'Alice',
  profileImage: 'https://example.com/alice.png',
};

const recentRooms: RecentRoomRecord[] = [
  {
    id: 'room-1',
    name: 'Morning Jazz',
    inviteCode: 'ABCD1234',
    lastJoinedAt: new Date('2026-07-01T12:00:00.000Z'),
  },
];

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    findUserById: vi.fn().mockResolvedValue(userProfile),
    findRecentRooms: vi.fn().mockResolvedValue(recentRooms),
    ...overrides,
  };
}

describe('UserService', () => {
  it('사용자 프로필을 반환한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    await expect(service.getMe('user-id')).resolves.toEqual(userProfile);
    expect(repo.findUserById).toHaveBeenCalledWith('user-id');
  });

  it('사용자를 찾지 못하면 AUTH_USER_NOT_FOUND를 반환한다', async () => {
    const repo = makeRepo({
      findUserById: vi.fn().mockResolvedValue(null),
    });
    const service = new UserService(repo);

    await expect(service.getMe('missing-id')).rejects.toMatchObject({
      status: 404,
      code: 'AUTH_USER_NOT_FOUND',
    });
  });

  it('최근 방 목록을 반환한다', async () => {
    const repo = makeRepo();
    const service = new UserService(repo);

    await expect(service.getRecentRooms('user-id')).resolves.toEqual(recentRooms);
    expect(repo.findRecentRooms).toHaveBeenCalledWith('user-id');
  });

  it('최근 방 목록이 비어 있으면 빈 배열을 반환한다', async () => {
    const repo = makeRepo({
      findRecentRooms: vi.fn().mockResolvedValue([]),
    });
    const service = new UserService(repo);

    await expect(service.getRecentRooms('user-id')).resolves.toEqual([]);
  });
});
