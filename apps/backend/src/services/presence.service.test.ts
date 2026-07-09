import { afterEach, describe, expect, it, vi } from 'vitest';

import { PresenceService } from './presence.service';
import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys } from '../lib/cache/cacheKeys';
import type { IRoomRepository, RoomMemberRecord, RoomMembershipRecord } from '../types/room';

const member: RoomMemberRecord = {
  id: 'member-1',
  userId: 'user-1',
  nickname: 'Alice',
  profileImage: null,
  role: 'member',
  status: 'offline',
};

function makeCache(): {
  cache: ICache;
  setMock: ReturnType<typeof vi.fn>;
  delMock: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, unknown>();
  const setMock = vi.fn((key: string, value: unknown) => {
    store.set(key, value);
  });
  const delMock = vi.fn((key: string) => {
    store.delete(key);
  });

  return {
    cache: {
      get<T>(key: string): T | undefined {
        return store.get(key) as T | undefined;
      },
      set<T>(key: string, value: T): void {
        setMock(key, value);
      },
      del(key: string): void {
        delMock(key);
      },
      has(key: string): boolean {
        return store.has(key);
      },
    },
    setMock,
    delMock,
  };
}

function makeFixture(
  overrides: {
    membership?: RoomMembershipRecord | null;
    memberInfo?: RoomMemberRecord | null;
    cache?: ICache;
  } = {},
) {
  const roomRepo = {
    findMembership: vi
      .fn()
      .mockResolvedValue(
        'membership' in overrides ? overrides.membership : { role: 'member', status: 'online' },
      ),
    updateMemberStatus: vi.fn().mockResolvedValue(true),
    findMemberInfo: vi
      .fn()
      .mockResolvedValue('memberInfo' in overrides ? overrides.memberInfo : member),
  } satisfies Pick<IRoomRepository, 'findMembership' | 'updateMemberStatus' | 'findMemberInfo'>;
  const cacheFixture = overrides.cache
    ? { cache: overrides.cache, setMock: vi.fn(), delMock: vi.fn() }
    : makeCache();

  return {
    service: new PresenceService(roomRepo, cacheFixture.cache),
    roomRepo,
    cache: cacheFixture.cache,
    cacheMocks: {
      set: cacheFixture.setMock,
      del: cacheFixture.delMock,
    },
  };
}

describe('PresenceService', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('활성 Host 멤버십이면 역할을 반환한다', async () => {
    const { service } = makeFixture({ membership: { role: 'host', status: 'online' } });

    await expect(service.getActiveMembershipRole('room-1', 'user-1')).resolves.toBe('host');
  });

  it('offline 멤버십도 활성 참여자로 보고 역할을 반환한다', async () => {
    const { service } = makeFixture({ membership: { role: 'member', status: 'offline' } });

    await expect(service.getActiveMembershipRole('room-1', 'user-1')).resolves.toBe('member');
  });

  it('멤버십이 없으면 역할 조회는 null을 반환한다', async () => {
    const { service } = makeFixture({ membership: null });

    await expect(service.getActiveMembershipRole('room-1', 'user-1')).resolves.toBeNull();
  });

  it('이미 나간 멤버십이면 역할 조회는 null을 반환한다', async () => {
    const { service } = makeFixture({ membership: { role: 'member', status: 'left' } });

    await expect(service.getActiveMembershipRole('room-1', 'user-1')).resolves.toBeNull();
  });

  it('멤버 offline 타이머를 5초 후 실행하고 cache에 저장한다', () => {
    vi.useFakeTimers();
    const { service, cacheMocks } = makeFixture();
    const onExpire = vi.fn();

    service.scheduleMemberOfflineTimer('room-1', 'user-1', onExpire);
    vi.advanceTimersByTime(4_999);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(cacheMocks.set).toHaveBeenCalledWith(
      CacheKeys.memberOfflineTimer('room-1', 'user-1'),
      expect.anything(),
    );
  });

  it('멤버 offline 타이머를 연속 예약하면 이전 타이머를 취소한다', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { service } = makeFixture();
    const firstExpire = vi.fn();
    const secondExpire = vi.fn();

    service.scheduleMemberOfflineTimer('room-1', 'user-1', firstExpire);
    service.scheduleMemberOfflineTimer('room-1', 'user-1', secondExpire);
    vi.advanceTimersByTime(5_000);

    expect(firstExpire).not.toHaveBeenCalled();
    expect(secondExpire).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('대기 중인 멤버 offline 타이머를 취소하고 true를 반환한다', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { service, cacheMocks } = makeFixture();

    service.scheduleMemberOfflineTimer('room-1', 'user-1', vi.fn());

    expect(service.cancelMemberOfflineTimer('room-1', 'user-1')).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cacheMocks.del).toHaveBeenCalledWith(CacheKeys.memberOfflineTimer('room-1', 'user-1'));
  });

  it('대기 중인 멤버 offline 타이머가 없으면 false를 반환한다', () => {
    const { service, cacheMocks } = makeFixture();

    expect(service.cancelMemberOfflineTimer('room-1', 'user-1')).toBe(false);
    expect(cacheMocks.del).not.toHaveBeenCalled();
  });

  it('Host close 타이머를 1분 후 실행하고 cache에 저장한다', () => {
    vi.useFakeTimers();
    const { service, cacheMocks } = makeFixture();
    const onExpire = vi.fn();

    service.scheduleHostCloseTimer('room-1', onExpire);
    vi.advanceTimersByTime(59_999);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(cacheMocks.set).toHaveBeenCalledWith(CacheKeys.hostTimer('room-1'), expect.anything());
  });

  it('Host close 타이머를 연속 예약하면 이전 타이머를 취소한다', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { service } = makeFixture();
    const firstExpire = vi.fn();
    const secondExpire = vi.fn();

    service.scheduleHostCloseTimer('room-1', firstExpire);
    service.scheduleHostCloseTimer('room-1', secondExpire);
    vi.advanceTimersByTime(60_000);

    expect(firstExpire).not.toHaveBeenCalled();
    expect(secondExpire).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });

  it('대기 중인 Host close 타이머를 취소하고 true를 반환한다', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { service, cacheMocks } = makeFixture();

    service.scheduleHostCloseTimer('room-1', vi.fn());

    expect(service.cancelHostCloseTimer('room-1')).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(cacheMocks.del).toHaveBeenCalledWith(CacheKeys.hostTimer('room-1'));
  });

  it('대기 중인 Host close 타이머가 없으면 false를 반환한다', () => {
    const { service, cacheMocks } = makeFixture();

    expect(service.cancelHostCloseTimer('room-1')).toBe(false);
    expect(cacheMocks.del).not.toHaveBeenCalled();
  });

  it('online 멤버를 offline으로 전환하고 멤버 정보를 반환한다', async () => {
    const { service, roomRepo } = makeFixture();
    roomRepo.updateMemberStatus.mockResolvedValue(true);

    await expect(service.setMemberOffline('room-1', 'user-1')).resolves.toEqual(member);
    expect(roomRepo.updateMemberStatus).toHaveBeenCalledWith('room-1', 'user-1', 'offline', [
      'online',
    ]);
    expect(roomRepo.findMemberInfo).toHaveBeenCalledWith('room-1', 'user-1');
  });

  it('이미 online이 아니면(offline/left/멤버십 없음) 전환하지 않고 null을 반환한다', async () => {
    const { service, roomRepo } = makeFixture();
    roomRepo.updateMemberStatus.mockResolvedValue(false);

    await expect(service.setMemberOffline('room-1', 'user-1')).resolves.toBeNull();
    expect(roomRepo.updateMemberStatus).toHaveBeenCalledWith('room-1', 'user-1', 'offline', [
      'online',
    ]);
    expect(roomRepo.findMemberInfo).not.toHaveBeenCalled();
  });
});
