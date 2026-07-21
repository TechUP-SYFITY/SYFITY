import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/lib/api/apiClient';

import { roomMemberApi } from './roomMemberApi';

vi.mock('@/shared/lib/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('roomMemberApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('활성 멤버를 조회한다', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ members: [] });

    await roomMemberApi.getActiveMembers('room-1');

    expect(apiClient.get).toHaveBeenCalledWith('/rooms/room-1/members');
  });

  it('추방 멤버를 조회한다', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ members: [] });

    await roomMemberApi.getKickedMembers('room-1');

    expect(apiClient.get).toHaveBeenCalledWith('/rooms/room-1/members?status=kicked');
  });

  it.each(['kicked', 'left'] as const)('멤버 상태를 %s로 변경한다', async (status) => {
    vi.mocked(apiClient.patch).mockResolvedValue({ memberId: 'membership-1', status });

    await roomMemberApi.updateMember('room-1', 'membership-1', { status });

    expect(apiClient.patch).toHaveBeenCalledWith('/rooms/room-1/members/membership-1', {
      status,
    });
  });
});
