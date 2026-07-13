'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useEffect, useRef, useState } from 'react';

import { getAdjacentPlayablePlaylistItems, getCurrentPlaylistItem } from '@/shared/lib/playback';

import { RoomShell, type RoomMobileTab } from '@/widgets/room/RoomShell';

import { UserMenu } from '@/features/auth/components/UserMenu';
import { useMe } from '@/features/auth/hooks/useAuth';
import { sortChatMessagesAscending } from '@/features/chat/lib/chatMessageOrder';
import { useChatStore } from '@/features/chat/store/chatStore';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayerVolumeStore } from '@/features/player/playerVolumeStore';
import { usePlayerControls } from '@/features/player/usePlayerControls';
import { getPlaylistErrorMessage } from '@/features/playlist/playlistErrorMessage';
import { useAddPlaylistItem } from '@/features/playlist/playlistHooks';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { usePlaylistStore } from '@/features/playlist/playlistStore';
import type { AddPlaylistItemRequest } from '@/features/playlist/playlistTypes';
import { InviteCodeDialog } from '@/features/room/components/InviteCodeDialog';
import { RoomErrorState } from '@/features/room/components/RoomErrorState';
import { RoomLoadingState } from '@/features/room/components/RoomLoadingState';
import { useJoinRoom } from '@/features/room/roomHooks';
import { useRoomStore } from '@/features/room/roomStore';
import type { YoutubeSearchResult } from '@/features/search/api/searchApi';
import {
  SearchAddToast,
  type SearchAddToastFeedback,
} from '@/features/search/components/SearchAddToast';
import { SearchPanel } from '@/features/search/components/SearchPanel';

import { useRoomLiveConnections } from './useRoomLiveConnections';

interface RoomPageClientProps {
  roomId: string;
}

export function RoomPageClient({ roomId }: RoomPageClientProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab>('playlist');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<SearchAddToastFeedback | null>(null);
  const toastIdRef = useRef(0);
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
  const setMessages = useChatStore((state) => state.setMessages);

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
    setMessages(sortChatMessagesAscending(joinRoom.data.recentChats));
  }, [joinRoom.data, setJoinedRoom, setMessages, setPlaybackState, setPlaylist]);

  const isHost = me !== undefined && room !== null && me.id === room.hostId;
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const { nextItem, previousItem } = getAdjacentPlayablePlaylistItems(playlist, currentTrack);
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
    setToastFeedback(null);
    setIsSearchPanelOpen(false);
  };

  const showAddToast = (variant: SearchAddToastFeedback['variant'], message: string) => {
    toastIdRef.current += 1;
    setToastFeedback({ id: toastIdRef.current, message, variant });
  };

  const addPlaylistItem = (body: AddPlaylistItemRequest) => {
    setToastFeedback(null);
    addSearchResult.reset();
    addSearchResult.mutate(body, {
      onError: (error) => showAddToast('error', getPlaylistErrorMessage(error)),
      onSuccess: () => showAddToast('success', '플레이리스트에 추가했어요 🎵'),
    });
  };

  const handleAddSearchResult = (result: YoutubeSearchResult) => {
    if (!hasJoinedRoom) {
      return;
    }

    addPlaylistItem({ videoId: result.videoId });
  };

  const handleAddYoutubeUrl = (youtubeUrl: string) => {
    if (!hasJoinedRoom) {
      return;
    }

    addPlaylistItem({ youtubeUrl });
  };

  return (
    <>
      <RoomShell
        headerActions={<UserMenu />}
        activeMobileTab={activeMobileTab}
        currentUserName={me?.nickname}
        currentUserProfileImage={me?.profileImage}
        isHost={isHost}
        miniPlayerCommandError={miniPlayerControls.commandError}
        miniPlayerControlDisabled={miniPlayerControls.controlDisabled}
        miniPlayerIsMuted={miniPlayerIsMuted}
        miniPlayerNextDisabled={!nextItem}
        miniPlayerPendingCommand={miniPlayerControls.pendingCommand}
        miniPlayerPreviousDisabled={!previousItem}
        miniPlayerVolume={miniPlayerVolume}
        members={members}
        onInviteClick={() => setIsInviteOpen(true)}
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
          <PlayerPanel
            roomId={roomId}
            isHost={isHost}
            onEnded={miniPlayerControls.handleNextTrack}
            onPlaybackStateChange={miniPlayerControls.handlePlaybackStateChange}
            playlist={playlist}
          />
        )}
        renderPlaylistPanel={() => (
          <PlaylistPanel
            currentPlaylistItemId={currentTrack?.id ?? null}
            roomId={roomId}
            isHost={isHost}
            isReady={hasJoinedRoom}
            onOpenSearch={handleOpenSearch}
          />
        )}
        room={room}
        roomId={roomId}
      />
      <InviteCodeDialog room={room} open={isInviteOpen} onOpenChange={setIsInviteOpen} />
      <SearchPanel
        feedback={
          <SearchAddToast feedback={toastFeedback} onClose={() => setToastFeedback(null)} />
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
