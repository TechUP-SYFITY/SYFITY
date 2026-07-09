import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys, CacheTTL } from '../lib/cache/cacheKeys';
import type { IRoomRepository, RoomMemberRecord, RoomRole } from '../types/room';

export const MEMBER_OFFLINE_GRACE_MS = 5_000;
export const HOST_CLOSE_TIMEOUT_MS = 60_000;

type PresenceRoomRepository = Pick<
  IRoomRepository,
  'findMembership' | 'updateMemberStatus' | 'findMemberInfo'
>;

export class PresenceService {
  constructor(
    private readonly roomRepo: PresenceRoomRepository,
    private readonly cache: ICache,
  ) {}

  async getActiveMembershipRole(roomId: string, userId: string): Promise<RoomRole | null> {
    const membership = await this.roomRepo.findMembership(roomId, userId);
    if (!membership || membership.status === 'left') return null;

    return membership.role;
  }

  scheduleMemberOfflineTimer(roomId: string, userId: string, onExpire: () => void): void {
    this.cancelMemberOfflineTimer(roomId, userId);
    const timer = setTimeout(onExpire, MEMBER_OFFLINE_GRACE_MS);

    this.cache.set(CacheKeys.memberOfflineTimer(roomId, userId), timer, 0);
  }

  cancelMemberOfflineTimer(roomId: string, userId: string): boolean {
    const key = CacheKeys.memberOfflineTimer(roomId, userId);
    const timer = this.cache.get<NodeJS.Timeout>(key);
    if (!timer) return false;

    clearTimeout(timer);
    this.cache.del(key);
    return true;
  }

  scheduleHostCloseTimer(roomId: string, onExpire: () => void): void {
    this.cancelHostCloseTimer(roomId);
    const timer = setTimeout(onExpire, HOST_CLOSE_TIMEOUT_MS);

    this.cache.set(CacheKeys.hostTimer(roomId), timer, CacheTTL.HOST_TIMER);
  }

  cancelHostCloseTimer(roomId: string): boolean {
    const key = CacheKeys.hostTimer(roomId);
    const timer = this.cache.get<NodeJS.Timeout>(key);
    if (!timer) return false;

    clearTimeout(timer);
    this.cache.del(key);
    return true;
  }

  async setMemberOffline(roomId: string, userId: string): Promise<RoomMemberRecord | null> {
    const didTransition = await this.roomRepo.updateMemberStatus(roomId, userId, 'offline', [
      'online',
    ]);
    if (!didTransition) return null;

    return this.roomRepo.findMemberInfo(roomId, userId);
  }
}
