import type { Request as ExRequest } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { RoomMembershipController } from './room-membership.controller';

const room = {
  id: 'room-1',
  name: 'Morning Jazz',
  hostId: 'host-1',
  inviteCode: 'ABC123',
  status: 'active' as const,
  createdAt: new Date('2026-07-01T12:00:00.000Z'),
};

const request = { user: { id: 'user-1', email: 'user@example.com' } } as ExRequest;

describe('RoomMembershipController', () => {
  it('신규 참여는 201과 영속 Room 정보만 반환한다', async () => {
    const createMembership = vi.fn().mockResolvedValue({ room, isNewMembership: true });
    const created = vi.fn((_: 201, body) => body);
    const ok = vi.fn();
    const controller = new RoomMembershipController({ createMembership });

    await expect(
      controller.createMembership(request, { inviteCode: 'ABC123' }, created, ok),
    ).resolves.toEqual({
      success: true,
      data: {
        room: {
          id: 'room-1',
          name: 'Morning Jazz',
          hostId: 'host-1',
          inviteCode: 'ABC123',
          status: 'active',
        },
      },
    });
    expect(created).toHaveBeenCalledWith(201, expect.any(Object));
    expect(ok).not.toHaveBeenCalled();
  });

  it('기존 참여 이력 복원은 200 responder로 영속 Room 정보만 반환한다', async () => {
    const createMembership = vi.fn().mockResolvedValue({ room, isNewMembership: false });
    const created = vi.fn();
    const ok = vi.fn((_: 200, body) => body);
    const controller = new RoomMembershipController({ createMembership });

    await expect(
      controller.createMembership(request, { inviteCode: 'ABC123' }, created, ok),
    ).resolves.toEqual({
      success: true,
      data: {
        room: {
          id: 'room-1',
          name: 'Morning Jazz',
          hostId: 'host-1',
          inviteCode: 'ABC123',
          status: 'active',
        },
      },
    });

    expect(created).not.toHaveBeenCalled();
    expect(ok).toHaveBeenCalledWith(200, expect.any(Object));
    expect(createMembership).toHaveBeenCalledWith('user-1', 'ABC123');
  });
});
