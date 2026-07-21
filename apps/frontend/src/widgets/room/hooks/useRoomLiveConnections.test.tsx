import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRoomSocket } from '@/features/room/hooks/useRoomSocket';

import { useRoomLiveConnections } from './useRoomLiveConnections';

vi.mock('@/features/room/hooks/useRoomSocket', () => ({ useRoomSocket: vi.fn() }));
vi.mock('@/features/chat/hooks/useChatSocket', () => ({ useChatSocket: vi.fn() }));
vi.mock('@/features/player/hooks/usePlaybackSocket', () => ({ usePlaybackSocket: vi.fn() }));
vi.mock('@/features/playlist/hooks/playlistHooks', () => ({ usePlaylistSocket: vi.fn() }));
vi.mock('@/features/presence/hooks/usePresenceSocket', () => ({ usePresenceSocket: vi.fn() }));

describe('useRoomLiveConnections', () => {
  it('snapshot callback을 Room socket에 연결한다', () => {
    const onSnapshot = vi.fn();
    const onRoomClosed = vi.fn();
    renderHook(() => useRoomLiveConnections('room-1', true, onRoomClosed, onSnapshot));

    expect(useRoomSocket).toHaveBeenCalledWith('room-1', onSnapshot, onRoomClosed);
  });

  it('비활성 상태에서는 빈 roomId로 Room socket을 호출한다', () => {
    renderHook(() => useRoomLiveConnections('room-1', false));

    expect(useRoomSocket).toHaveBeenCalledWith('', undefined, undefined);
  });
});
