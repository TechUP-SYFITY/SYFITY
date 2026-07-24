'use client';

// REST 입장 완료 이후 Room/Playback/Playlist Socket 연결을 한 번에 초기화한다.
import type { RoomJoinedPayload, RoomKickedPayload } from '@/shared/types/socket';

import { useChatSocket } from '@/features/chat/hooks/useChatSocket';
import { usePlaybackSocket } from '@/features/player/hooks/usePlaybackSocket';
import { usePlaylistSocket } from '@/features/playlist/hooks/playlistHooks';
import { usePresenceSocket } from '@/features/presence/hooks/usePresenceSocket';
import { useRoomSocket } from '@/features/room/hooks/useRoomSocket';

export function useRoomLiveConnections(
  roomId: string,
  enabled: boolean,
  onRoomClosed?: () => void,
  onSnapshot?: (snapshot: RoomJoinedPayload) => void,
  onRoomKicked?: (payload: RoomKickedPayload) => void,
) {
  usePlaybackSocket(enabled);
  usePlaylistSocket(enabled ? roomId : '');
  useRoomSocket(enabled ? roomId : '', onSnapshot, onRoomClosed, onRoomKicked);
  useChatSocket(enabled ? roomId : '');
  usePresenceSocket(enabled ? roomId : '');
}
