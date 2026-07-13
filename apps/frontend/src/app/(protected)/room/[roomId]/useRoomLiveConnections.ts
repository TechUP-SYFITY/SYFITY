'use client';

// REST 입장 완료 이후 Room/Playback/Playlist Socket 연결을 한 번에 초기화한다.
import { useChatSocket } from '@/features/chat/hooks/chatHooks';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlaylistSocket } from '@/features/playlist/playlistHooks';
import { usePresenceSocket } from '@/features/presence/presenceHooks';
import { useRoomSocket } from '@/features/room/useRoomSocket';

export function useRoomLiveConnections(
  roomId: string,
  enabled: boolean,
  onRoomClosed?: () => void,
) {
  usePlaybackSocket(enabled);
  usePlaylistSocket(enabled ? roomId : '');
  useRoomSocket(enabled ? roomId : '', onRoomClosed);
  useChatSocket(enabled ? roomId : '');
  usePresenceSocket(enabled ? roomId : '');
}
