import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePresenceStore } from '@/features/presence/store/presenceStore';
import { useRoomSocket } from '@/features/room/hooks/useRoomSocket';

import { useRoomLiveConnections } from './useRoomLiveConnections';

vi.mock('@/features/chat/chatHooks', () => ({ useChatSocket: vi.fn() }));
vi.mock('@/features/player/hooks/usePlaybackSocket', () => ({ usePlaybackSocket: vi.fn() }));
vi.mock('@/features/playlist/hooks/playlistHooks', () => ({ usePlaylistSocket: vi.fn() }));
vi.mock('@/features/presence/hooks/usePresenceSocket', () => ({ usePresenceSocket: vi.fn() }));
vi.mock('@/features/room/hooks/useRoomSocket', () => ({ useRoomSocket: vi.fn() }));

describe('useRoomLiveConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('room join ack의 members를 presence store에 연결한다', () => {
    renderHook(() => useRoomLiveConnections('room-1', true));

    expect(useRoomSocket).toHaveBeenCalledWith(
      'room-1',
      usePresenceStore.getState().setMembers,
      undefined,
    );
  });

  it('비활성 상태에서는 빈 roomId로 room socket을 호출한다', () => {
    renderHook(() => useRoomLiveConnections('room-1', false));

    expect(useRoomSocket).toHaveBeenCalledWith(
      '',
      usePresenceStore.getState().setMembers,
      undefined,
    );
  });

  it('Room 종료 callback을 room socket에 그대로 전달한다', () => {
    const onRoomClosed = vi.fn();

    renderHook(() => useRoomLiveConnections('room-1', true, onRoomClosed));

    expect(useRoomSocket).toHaveBeenCalledWith(
      'room-1',
      usePresenceStore.getState().setMembers,
      onRoomClosed,
    );
  });
});
