'use client';

// REST 입장 완료 이후 Room/Playback/Playlist Socket 연결을 한 번에 초기화한다.
import { useChatSocket } from '@/features/chat/chatHooks';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlaylistSocket } from '@/features/playlist/playlistHooks';
import { useRoomSocket } from '@/features/room/useRoomSocket';

export function useRoomLiveConnections(roomId: string, enabled: boolean) {
  usePlaybackSocket(enabled);
  usePlaylistSocket(enabled ? roomId : '');
  useRoomSocket(enabled ? roomId : '');
  useChatSocket(enabled ? roomId : '');
}
