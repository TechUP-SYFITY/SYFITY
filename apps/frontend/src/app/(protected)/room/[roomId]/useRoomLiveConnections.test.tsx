import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePresenceStore } from '@/features/presence/presenceStore';
import { useRoomSocket } from '@/features/room/useRoomSocket';

import { useRoomLiveConnections } from './useRoomLiveConnections';

vi.mock('@/features/chat/chatHooks', () => ({ useChatSocket: vi.fn() }));
vi.mock('@/features/player/usePlaybackSocket', () => ({ usePlaybackSocket: vi.fn() }));
vi.mock('@/features/playlist/playlistHooks', () => ({ usePlaylistSocket: vi.fn() }));
vi.mock('@/features/presence/presenceHooks', () => ({ usePresenceSocket: vi.fn() }));
vi.mock('@/features/room/useRoomSocket', () => ({ useRoomSocket: vi.fn() }));

describe('useRoomLiveConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('room join ack의 members를 presence store에 연결한다', () => {
    renderHook(() => useRoomLiveConnections('room-1', true));

    expect(useRoomSocket).toHaveBeenCalledWith('room-1', usePresenceStore.getState().setMembers);
  });

  it('비활성 상태에서는 빈 roomId로 room socket을 호출한다', () => {
    renderHook(() => useRoomLiveConnections('room-1', false));

    expect(useRoomSocket).toHaveBeenCalledWith('', usePresenceStore.getState().setMembers);
  });
});
