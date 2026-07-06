'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useEffect, useRef, useState } from 'react';

import type { RoomMember } from '@/shared/types/domain';

import { playbackCommands } from '@/features/player/playbackCommands';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlaylistSocket } from '@/features/playlist/playlistHooks';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { useJoinRoom } from '@/features/room/roomHooks';
import {
  ROOM_PREVIEW_CHATS,
  ROOM_PREVIEW_MEMBERS,
  ROOM_PREVIEW_PLAYLIST,
  ROOM_PREVIEW_ROOM,
} from '@/features/room/roomPreviewData';
import { RoomShell, type RoomMobileTab } from '@/features/room/RoomShell';
import { useRoomStore } from '@/features/room/roomStore';
import { useRoomSocket } from '@/features/room/useRoomSocket';

interface RoomPageClientProps {
  roomId: string;
}

export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const hasRequestedJoin = useRef(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab>('playlist');
  const joinRoom = useJoinRoom();
  const members = useRoomStore((state) => state.members);
  const roomFromStore = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  usePlaybackSocket(hasJoinedRoom);
  usePlaylistSocket(hasJoinedRoom ? roomId : '');
  useRoomSocket(hasJoinedRoom ? roomId : '');

  useEffect(() => {
    if (hasRequestedJoin.current) {
      return;
    }

    hasRequestedJoin.current = true;
    joinRoom.mutate(
      { roomId },
      {
        onError: () => {
          setHasJoinedRoom(false);
        },
        onSuccess: (data) => {
          setJoinedRoom(data);
          setPlaylist(data.playlist);
          setPlaybackState(data.playbackState, 'room-join');
          setHasJoinedRoom(true);
        },
      },
    );
  }, [joinRoom, roomId, setJoinedRoom, setPlaybackState, setPlaylist]);

  const handlePlayItem = (playlistItemId: string) => {
    void playbackCommands.changeTrack(roomId, playlistItemId);
  };

  const shouldShowPreviewData = process.env.NODE_ENV === 'development' && joinRoom.isError;
  const visibleRoom = shouldShowPreviewData ? ROOM_PREVIEW_ROOM : roomFromStore;
  const visibleMembers = shouldShowPreviewData ? ROOM_PREVIEW_MEMBERS : members;
  const visiblePlaylist = shouldShowPreviewData ? ROOM_PREVIEW_PLAYLIST : playlist;
  const visibleChats = shouldShowPreviewData ? ROOM_PREVIEW_CHATS : [];
  const currentUserId = getCurrentUserId();
  const isHost = shouldShowPreviewData ? true : isCurrentUserHost(visibleMembers, currentUserId);

  return (
    <RoomShell
      activeMobileTab={activeMobileTab}
      chats={visibleChats}
      isHost={isHost}
      members={visibleMembers}
      onMobileTabChange={setActiveMobileTab}
      playbackState={playbackState}
      playlist={visiblePlaylist}
      renderPlayerPanel={() => (
        <PlayerPanel roomId={roomId} isHost={isHost} playlist={visiblePlaylist} />
      )}
      renderPlaylistPanel={() => (
        <PlaylistPanel
          playlistItems={shouldShowPreviewData ? visiblePlaylist : undefined}
          roomId={roomId}
          isHost={isHost}
          isReady={hasJoinedRoom || shouldShowPreviewData}
          onPlayItem={handlePlayItem}
        />
      )}
      room={visibleRoom}
    />
  );
}

function getCurrentUserId() {
  // TODO(#12 후속) auth/me 연동 후 실제 사용자 ID를 주입한다.
  return null;
}

function isCurrentUserHost(members: RoomMember[], currentUserId: string | null) {
  if (!currentUserId) {
    return false;
  }

  return members.some((member) => member.userId === currentUserId && member.role === 'host');
}
