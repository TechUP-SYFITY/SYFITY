'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useEffect, useState } from 'react';

import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { RoomMember } from '@/shared/types/domain';

import { playbackCommands } from '@/features/player/playbackCommands';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayerVolumeStore } from '@/features/player/playerVolumeStore';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlayerControls } from '@/features/player/usePlayerControls';
import { getPlaylistErrorMessage } from '@/features/playlist/playlistErrorMessage';
import { useAddPlaylistItem, usePlaylistSocket } from '@/features/playlist/playlistHooks';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { RoomErrorState } from '@/features/room/components/RoomErrorState';
import { RoomLoadingState } from '@/features/room/components/RoomLoadingState';
import { useJoinRoom } from '@/features/room/roomHooks';
import { RoomShell, type RoomMobileTab } from '@/features/room/RoomShell';
import { useRoomStore } from '@/features/room/roomStore';
import { useRoomSocket } from '@/features/room/useRoomSocket';
import type { YoutubeSearchResult } from '@/features/search/api/searchApi';
import { SearchPanel } from '@/features/search/components/SearchPanel';

interface RoomPageClientProps {
  roomId: string;
}

export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab>('playlist');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const joinRoom = useJoinRoom(roomId);
  const members = useRoomStore((state) => state.members);
  const room = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const miniPlayerIsMuted = usePlayerVolumeStore((state) => state.isMuted);
  const setMiniPlayerVolume = usePlayerVolumeStore((state) => state.setVolume);
  const toggleMiniPlayerMute = usePlayerVolumeStore((state) => state.toggleMuted);
  const miniPlayerVolume = usePlayerVolumeStore((state) => state.volume);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  const hasJoinedRoom = joinRoom.isSuccess;
  const activeRoomId = room?.id ?? roomId;
  const addSearchResult = useAddPlaylistItem(activeRoomId);

  usePlaybackSocket(hasJoinedRoom);
  usePlaylistSocket(hasJoinedRoom ? activeRoomId : '');
  useRoomSocket(hasJoinedRoom ? activeRoomId : '');

  useEffect(() => {
    if (!joinRoom.data) {
      return;
    }

    setJoinedRoom(joinRoom.data);
    setPlaylist(joinRoom.data.playlist);
    setPlaybackState(joinRoom.data.playbackState, 'room-join');
  }, [joinRoom.data, setJoinedRoom, setPlaybackState, setPlaylist]);

  const currentUserId = getCurrentUserId();
  const isHost = isCurrentUserHost(members, currentUserId);
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const currentIndex = currentTrack
    ? playlist.findIndex((item) => item.id === currentTrack.id)
    : -1;
  const previousItem = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextItem = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;
  const miniPlayerHasPlayableTrack = Boolean(currentTrack && playbackState?.videoId);
  const miniPlayerControls = usePlayerControls({
    currentTime: playbackState?.currentTime ?? 0,
    hasPlayableTrack: miniPlayerHasPlayableTrack,
    isHost,
    isPlaying: playbackState?.isPlaying ?? false,
    nextItemId: nextItem?.id,
    previousItemId: previousItem?.id,
    roomId: activeRoomId,
  });

  if (joinRoom.isPending) {
    return <RoomLoadingState />;
  }

  if (joinRoom.isError) {
    return <RoomErrorState error={joinRoom.error} roomId={roomId} />;
  }

  const handlePlayItem = (playlistItemId: string) => {
    void playbackCommands.changeTrack(activeRoomId, playlistItemId);
  };

  const handleOpenSearch = () => {
    addSearchResult.reset();
    setIsSearchPanelOpen(true);
  };

  const handleCloseSearch = () => {
    addSearchResult.reset();
    setIsSearchPanelOpen(false);
  };

  const handleAddSearchResult = (result: YoutubeSearchResult) => {
    if (!hasJoinedRoom) {
      return;
    }

    addSearchResult.reset();
    addSearchResult.mutate({ videoId: result.videoId });
  };

  return (
    <>
      <RoomShell
        activeMobileTab={activeMobileTab}
        chats={[]}
        isHost={isHost}
        miniPlayerCommandError={miniPlayerControls.commandError}
        miniPlayerControlDisabled={miniPlayerControls.controlDisabled}
        miniPlayerIsMuted={miniPlayerIsMuted}
        miniPlayerNextDisabled={!nextItem}
        miniPlayerPendingCommand={miniPlayerControls.pendingCommand}
        miniPlayerPreviousDisabled={!previousItem}
        miniPlayerVolume={miniPlayerVolume}
        members={members}
        onMuteToggle={toggleMiniPlayerMute}
        onMiniPlayerNextTrack={miniPlayerControls.handleNextTrack}
        onMiniPlayerPlayPause={miniPlayerControls.handlePlayPause}
        onMiniPlayerPreviousTrack={miniPlayerControls.handlePreviousTrack}
        onMiniPlayerVolumeChange={setMiniPlayerVolume}
        onMobileTabChange={setActiveMobileTab}
        playbackState={playbackState}
        playlist={playlist}
        renderPlayerPanel={() => (
          <PlayerPanel roomId={activeRoomId} isHost={isHost} playlist={playlist} />
        )}
        renderPlaylistPanel={() => (
          <PlaylistPanel
            roomId={activeRoomId}
            isHost={isHost}
            isReady={hasJoinedRoom}
            onOpenSearch={handleOpenSearch}
            onPlayItem={handlePlayItem}
          />
        )}
        room={room}
      />
      <SearchPanel
        addErrorMessage={
          addSearchResult.isError ? getPlaylistErrorMessage(addSearchResult.error) : undefined
        }
        isOpen={isSearchPanelOpen}
        roomName={room?.name ?? 'Room'}
        onAddResult={handleAddSearchResult}
        onClose={handleCloseSearch}
      />
    </>
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
