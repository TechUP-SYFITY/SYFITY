'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useRef, useState } from 'react';

import { getApiErrorMessage } from '@/shared/lib/api/errorMessage';
import { getAdjacentPlayablePlaylistItems, getCurrentPlaylistItem } from '@/shared/lib/playback';
import { PresenceMockPanel } from '@/shared/mocks/PresenceMockPanel';

import { RoomShell, type RoomMobileTab } from '@/widgets/room/RoomShell';

import { UserMenu } from '@/features/auth/components/UserMenu';
import { PlayerPanel } from '@/features/player/components/PlayerPanel';
import { usePlayerControls } from '@/features/player/hooks/usePlayerControls';
import type { PlayerController } from '@/features/player/types/playerTypes';
import { PlaylistPanel } from '@/features/playlist/components/PlaylistPanel';
import { useAddPlaylistItem } from '@/features/playlist/hooks/playlistHooks';
import type { AddPlaylistItemRequest } from '@/features/playlist/types/playlistTypes';
import { InviteCodeDialog } from '@/features/room/components/InviteCodeDialog';
import type { YoutubeSearchResult } from '@/features/search/api/searchApi';
import {
  SearchAddToast,
  type SearchAddToastFeedback,
} from '@/features/search/components/SearchAddToast';
import { SearchPanel } from '@/features/search/components/SearchPanel';

import { RoomErrorState } from './components/RoomErrorState';
import { RoomLoadingState } from './components/RoomLoadingState';
import { useMobileOverlayHistory } from './hooks/useMobileOverlayHistory';
import { useRoomPageSession } from './hooks/useRoomPageSession';
import { RoomSocketProvider } from './RoomSocketProvider';

interface RoomPageProps {
  roomId: string;
}

export function RoomPage({ roomId }: RoomPageProps) {
  return (
    <RoomSocketProvider>
      <RoomPageContent roomId={roomId} />
    </RoomSocketProvider>
  );
}

function RoomPageContent({ roomId }: RoomPageProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<RoomMobileTab | null>(null);
  useMobileOverlayHistory(activeMobileTab !== null, () => setActiveMobileTab(null));

  // 이미 열려있는 탭을 다시 누르면 닫히고, 다른 탭을 누르면 그 탭으로 전환한다.
  const handleMobileTabChange = (tab: RoomMobileTab | null) => {
    setActiveMobileTab((current) => (tab !== null && current === tab ? null : tab));
  };
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<SearchAddToastFeedback | null>(null);
  const toastIdRef = useRef(0);
  const playerControllerRef = useRef<PlayerController | null>(null);
  const {
    hasJoinedRoom,
    hostConnection,
    isMuted: miniPlayerIsMuted,
    joinRoom,
    localPlaybackPosition,
    me,
    onlineMemberCount,
    playbackState,
    playlist,
    room,
    setVolume: setMiniPlayerVolume,
    toggleMuted: toggleMiniPlayerMute,
    volume: miniPlayerVolume,
  } = useRoomPageSession(roomId);
  const addSearchResult = useAddPlaylistItem(roomId);

  const isHost = me !== undefined && room !== null && me.id === room.hostId;
  const isRoomConnectionStable = hostConnection.status === 'connected';
  const canControlRoom = isHost && isRoomConnectionStable;
  // 곡 추가와 Member 본인 곡 삭제는 Host 연결 상태와 무관하게 활성 멤버에게 허용된다.
  const isActiveRoomMember = hasJoinedRoom;
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const { nextItem, previousItem } = getAdjacentPlayablePlaylistItems(playlist, currentTrack);
  const currentTime =
    localPlaybackPosition && localPlaybackPosition.videoId === playbackState?.videoId
      ? localPlaybackPosition.currentTime
      : (playbackState?.currentTime ?? 0);
  const miniPlayerPlaybackState = playbackState ? { ...playbackState, currentTime } : null;
  const miniPlayerHasPlayableTrack = Boolean(currentTrack);
  const miniPlayerControls = usePlayerControls({
    canControlRoom,
    currentTime,
    hasPlayableTrack: miniPlayerHasPlayableTrack,
    isHost,
    isPlaying: playbackState?.isPlaying ?? false,
    nextItemId: nextItem?.id,
    playerControllerRef,
    previousItemId: previousItem?.id,
    roomId,
  });

  if (joinRoom.isPending) {
    return <RoomLoadingState />;
  }

  if (joinRoom.isError) {
    return <RoomErrorState error={joinRoom.error} roomId={roomId} />;
  }

  if (!hasJoinedRoom) {
    return <RoomLoadingState />;
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
      onError: (error) => showAddToast('error', getApiErrorMessage(error)),
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
        hostConnection={hostConnection}
        isHost={isHost}
        miniPlayerCommandError={miniPlayerControls.commandError}
        miniPlayerControlDisabled={miniPlayerControls.controlDisabled}
        miniPlayerIsLocalSyncPaused={miniPlayerControls.isLocalSyncPaused}
        miniPlayerIsMuted={miniPlayerIsMuted}
        miniPlayerNextDisabled={!nextItem}
        miniPlayerPendingCommand={miniPlayerControls.pendingCommand}
        miniPlayerPlayPauseDisabled={miniPlayerControls.playPauseDisabled}
        miniPlayerPreviousDisabled={!previousItem}
        miniPlayerVolume={miniPlayerVolume}
        onInviteClick={() => setIsInviteOpen(true)}
        onMuteToggle={toggleMiniPlayerMute}
        onMiniPlayerNextTrack={miniPlayerControls.handleNextTrack}
        onMiniPlayerPlayPause={miniPlayerControls.handlePlayPause}
        onMiniPlayerPreviousTrack={miniPlayerControls.handlePreviousTrack}
        onMiniPlayerSeek={miniPlayerControls.handleSeek}
        onMiniPlayerVolumeChange={setMiniPlayerVolume}
        onMobileTabChange={handleMobileTabChange}
        onlineMemberCount={onlineMemberCount}
        playbackState={miniPlayerPlaybackState}
        playlist={playlist}
        playerPanel={
          <PlayerPanel
            canControlRoom={canControlRoom}
            roomId={roomId}
            isHost={isHost}
            playerControllerRef={playerControllerRef}
            onEnded={miniPlayerControls.handleNextTrack}
            onPlaybackStateChange={miniPlayerControls.handlePlaybackStateChange}
            playlist={playlist}
          />
        }
        playlistPanel={
          <PlaylistPanel
            canControlRoom={canControlRoom}
            currentPlaylistItemId={currentTrack?.id ?? null}
            currentUserId={me?.id}
            isActiveRoomMember={isActiveRoomMember}
            roomId={roomId}
            isHost={isHost}
            isReady={hasJoinedRoom}
            onOpenSearch={handleOpenSearch}
          />
        }
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
      <PresenceMockPanel />
    </>
  );
}
