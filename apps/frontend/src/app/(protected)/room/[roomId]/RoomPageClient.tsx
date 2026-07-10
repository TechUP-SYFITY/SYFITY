'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useEffect, useState } from 'react';

import { getCurrentPlaylistItem } from '@/shared/lib/playback';

import { RoomShell, type RoomMobileTab } from '@/widgets/room/RoomShell';

import { UserMenu } from '@/features/auth/components/UserMenu';
import { useMe } from '@/features/auth/hooks/useAuth';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayerVolumeStore } from '@/features/player/playerVolumeStore';
import { usePlayerControls } from '@/features/player/usePlayerControls';
import { getPlaylistErrorMessage } from '@/features/playlist/playlistErrorMessage';
import { useAddPlaylistItem } from '@/features/playlist/playlistHooks';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import { RoomErrorState } from '@/features/room/components/RoomErrorState';
import { RoomLoadingState } from '@/features/room/components/RoomLoadingState';
import { useJoinRoom } from '@/features/room/roomHooks';
import { useRoomStore } from '@/features/room/roomStore';
import type { YoutubeSearchResult } from '@/features/search/api/searchApi';
import { SearchPanel } from '@/features/search/components/SearchPanel';

import { useRoomLiveConnections } from './useRoomLiveConnections';

interface RoomPageClientProps {
  roomId: string;
}

export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab>('playlist');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const joinRoom = useJoinRoom(roomId);
  const { data: me } = useMe();
  const members = useRoomStore((state) => state.members);
  const room = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const localPlaybackPosition = usePlayerStore((state) => state.localPlaybackPosition);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const miniPlayerIsMuted = usePlayerVolumeStore((state) => state.isMuted);
  const setMiniPlayerVolume = usePlayerVolumeStore((state) => state.setVolume);
  const toggleMiniPlayerMute = usePlayerVolumeStore((state) => state.toggleMuted);
  const miniPlayerVolume = usePlayerVolumeStore((state) => state.volume);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);

  const hasJoinedRoom = joinRoom.isSuccess;
  const addSearchResult = useAddPlaylistItem(roomId);

  useRoomLiveConnections(roomId, hasJoinedRoom);

  useEffect(() => {
    if (!joinRoom.data) {
      return;
    }

    setJoinedRoom(joinRoom.data);
    setPlaylist(joinRoom.data.playlist);
    setPlaybackState(joinRoom.data.playbackState, 'room-join');
  }, [joinRoom.data, setJoinedRoom, setPlaybackState, setPlaylist]);

  const isHost = me !== undefined && room !== null && me.id === room.hostId;
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const currentIndex = currentTrack
    ? playlist.findIndex((item) => item.id === currentTrack.id)
    : -1;
  const previousItem = currentIndex > 0 ? playlist[currentIndex - 1] : undefined;
  const nextItem = currentIndex >= 0 ? playlist[currentIndex + 1] : undefined;
  const currentTime =
    localPlaybackPosition && localPlaybackPosition.videoId === playbackState?.videoId
      ? localPlaybackPosition.currentTime
      : (playbackState?.currentTime ?? 0);
  const miniPlayerPlaybackState = playbackState ? { ...playbackState, currentTime } : null;
  const miniPlayerHasPlayableTrack = Boolean(currentTrack);
  const miniPlayerControls = usePlayerControls({
    currentTime,
    hasPlayableTrack: miniPlayerHasPlayableTrack,
    isHost,
    isPlaying: playbackState?.isPlaying ?? false,
    nextItemId: nextItem?.id,
    previousItemId: previousItem?.id,
    roomId,
  });

  if (joinRoom.isPending) {
    return <RoomLoadingState />;
  }

  if (joinRoom.isError) {
    return <RoomErrorState error={joinRoom.error} roomId={roomId} />;
  }

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

  const handleAddYoutubeUrl = (youtubeUrl: string) => {
    if (!hasJoinedRoom) {
      return;
    }

    addSearchResult.reset();
    addSearchResult.mutate({ youtubeUrl });
  };

  return (
    <>
      <RoomShell
        headerActions={<UserMenu />}
        activeMobileTab={activeMobileTab}
        chats={[]}
        currentUserName={me?.nickname}
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
        onMiniPlayerSeek={miniPlayerControls.handleSeek}
        onMiniPlayerVolumeChange={setMiniPlayerVolume}
        onMobileTabChange={setActiveMobileTab}
        playbackState={miniPlayerPlaybackState}
        playlist={playlist}
        renderPlayerPanel={() => (
          <PlayerPanel roomId={roomId} isHost={isHost} playlist={playlist} />
        )}
        renderPlaylistPanel={() => (
          <PlaylistPanel
            roomId={roomId}
            isHost={isHost}
            isReady={hasJoinedRoom}
            onOpenSearch={handleOpenSearch}
          />
        )}
        room={room}
      />
      <SearchPanel
        addErrorMessage={
          addSearchResult.isError ? getPlaylistErrorMessage(addSearchResult.error) : undefined
        }
        isAddPending={addSearchResult.isPending}
        isOpen={isSearchPanelOpen}
        roomName={room?.name ?? 'Room'}
        onAddResult={handleAddSearchResult}
        onAddUrl={handleAddYoutubeUrl}
        onClose={handleCloseSearch}
      />
    </>
  );
}
