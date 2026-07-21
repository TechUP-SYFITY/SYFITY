import { describe, expect, it, vi } from 'vitest';

import { RoomLifecycleService } from './room-lifecycle.service';

describe('RoomLifecycleService', () => {
  it('Repository 처리 건수를 응답 계약으로 감싼다', async () => {
    const roomRepo = { inactivateStaleRooms: vi.fn().mockResolvedValue(3) };
    const service = new RoomLifecycleService(roomRepo);

    await expect(service.inactivateStaleRooms()).resolves.toEqual({ inactivatedCount: 3 });
    expect(roomRepo.inactivateStaleRooms).toHaveBeenCalledOnce();
  });
});
