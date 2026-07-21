import type { ICache } from '../lib/cache/cache.interface';
import { CacheKeys, CacheTTL } from '../lib/cache/cacheKeys';
import type {
  HostConnectionState,
  IRoomRepository,
  RoomMemberRecord,
  RoomRole,
} from '../types/room';

export const MEMBER_OFFLINE_GRACE_MS = 5_000;
export const HOST_CLOSE_TIMEOUT_MS = 60_000;

type PresenceRoomRepository = Pick<
  IRoomRepository,
  'findMembership' | 'updateMemberStatus' | 'findMemberInfo'
>;

type HostCloseTimerState = {
  timer: NodeJS.Timeout;
  waitUntil: string;
};

export class PresenceService {
  constructor(
    private readonly roomRepo: PresenceRoomRepository,
    private readonly cache: ICache,
  ) {}

  async getActiveMembershipRole(roomId: string, userId: string): Promise<RoomRole | null> {
    const membership = await this.roomRepo.findMembership(roomId, userId);
    if (!membership || membership.status === 'left' || membership.status === 'kicked') return null;

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

  scheduleHostCloseTimer(roomId: string, onExpire: () => void): string {
    this.cancelHostCloseTimer(roomId);
    const waitUntil = new Date(Date.now() + HOST_CLOSE_TIMEOUT_MS).toISOString();
    const timer = setTimeout(onExpire, HOST_CLOSE_TIMEOUT_MS);

    this.cache.set<HostCloseTimerState>(
      CacheKeys.hostTimer(roomId),
      { timer, waitUntil },
      CacheTTL.HOST_TIMER,
    );

    return waitUntil;
  }

  cancelHostCloseTimer(roomId: string): boolean {
    const key = CacheKeys.hostTimer(roomId);
    const state = this.cache.get<HostCloseTimerState>(key);
    if (!state) return false;

    clearTimeout(state.timer);
    this.cache.del(key);
    return true;
  }

  getHostConnectionState(roomId: string): HostConnectionState {
    const state = this.cache.get<HostCloseTimerState>(CacheKeys.hostTimer(roomId));

    return state ? { status: 'disconnected', waitUntil: state.waitUntil } : { status: 'connected' };
  }

  async setMemberOffline(roomId: string, userId: string): Promise<RoomMemberRecord | null> {
    const didTransition = await this.roomRepo.updateMemberStatus(roomId, userId, 'offline', [
      'online',
    ]);
    if (!didTransition) return null;

    return this.roomRepo.findMemberInfo(roomId, userId);
  }
}
