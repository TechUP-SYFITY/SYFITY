'use client';

// Room 페이지에서 REST 입장, Socket 연결, 화면 조립 흐름을 연결한다.
import { useEffect, useRef, useState } from 'react';

import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { PlaybackState, PlaylistItem, RoomMember } from '@/shared/types/domain';

import { playbackCommands } from '@/features/player/playbackCommands';
import { PlayerPanel } from '@/features/player/PlayerPanel';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayerVolumeStore } from '@/features/player/playerVolumeStore';
import { usePlaybackSocket } from '@/features/player/usePlaybackSocket';
import { usePlayerControls } from '@/features/player/usePlayerControls';
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
import { roomPreviewPlaylistApi } from '@/features/room/roomPreviewPlaylistApi';
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
  const [previewPlaybackState, setPreviewPlaybackState] = useState<PlaybackState | null>(() => {
    const firstTrack = ROOM_PREVIEW_PLAYLIST[0];

    return firstTrack ? createPreviewPlaybackState(firstTrack, false) : null;
  });
  const joinRoom = useJoinRoom();
  const members = useRoomStore((state) => state.members);
  const roomFromStore = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const miniPlayerIsMuted = usePlayerVolumeStore((state) => state.isMuted);
  const setMiniPlayerVolume = usePlayerVolumeStore((state) => state.setVolume);
  const toggleMiniPlayerMute = usePlayerVolumeStore((state) => state.toggleMuted);
  const miniPlayerVolume = usePlayerVolumeStore((state) => state.volume);
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

  const shouldShowPreviewData = process.env.NODE_ENV === 'development' && joinRoom.isError;
  const visibleRoom = shouldShowPreviewData ? ROOM_PREVIEW_ROOM : roomFromStore;
  const visibleMembers = shouldShowPreviewData ? ROOM_PREVIEW_MEMBERS : members;
  const visiblePlaylist = shouldShowPreviewData ? ROOM_PREVIEW_PLAYLIST : playlist;
  const visibleChats = shouldShowPreviewData ? ROOM_PREVIEW_CHATS : [];
  const visiblePlaybackState = shouldShowPreviewData ? previewPlaybackState : playbackState;
  const currentUserId = getCurrentUserId();
  const isHost = shouldShowPreviewData ? true : isCurrentUserHost(visibleMembers, currentUserId);
  const currentTrack = getCurrentPlaylistItem(visiblePlaylist, visiblePlaybackState);
  const currentIndex = currentTrack
    ? visiblePlaylist.findIndex((item) => item.id === currentTrack.id)
    : -1;
  const previousItem = currentIndex > 0 ? visiblePlaylist[currentIndex - 1] : undefined;
  const nextItem = currentIndex >= 0 ? visiblePlaylist[currentIndex + 1] : undefined;
  const miniPlayerHasPlayableTrack = Boolean(currentTrack && visiblePlaybackState?.videoId);
  const miniPlayerControls = usePlayerControls({
    currentTime: visiblePlaybackState?.currentTime ?? 0,
    hasPlayableTrack: miniPlayerHasPlayableTrack && !shouldShowPreviewData,
    isHost,
    isPlaying: visiblePlaybackState?.isPlaying ?? false,
    nextItemId: nextItem?.id,
    previousItemId: previousItem?.id,
    roomId,
  });

  const handlePreviewPlayPause = () => {
    if (!shouldShowPreviewData || !currentTrack) {
      return;
    }

    setPreviewPlaybackState((current) => {
      const nextState = current ?? createPreviewPlaybackState(currentTrack, false);

      return {
        ...nextState,
        isPlaying: !nextState.isPlaying,
        playlistItemId: currentTrack.id,
        videoId: currentTrack.videoId,
      };
    });
  };

  const handlePreviewTrackChange = (targetTrack: PlaylistItem | undefined) => {
    if (!shouldShowPreviewData || !targetTrack) {
      return;
    }

    setPreviewPlaybackState((current) => ({
      currentTime: 0,
      isPlaying: current?.isPlaying ?? false,
      playlistItemId: targetTrack.id,
      videoId: targetTrack.videoId,
    }));
  };

  const handlePlayItem = (playlistItemId: string) => {
    if (shouldShowPreviewData) {
      handlePreviewTrackChange(visiblePlaylist.find((item) => item.id === playlistItemId));
      return;
    }

    void playbackCommands.changeTrack(roomId, playlistItemId);
  };

  return (
    <RoomShell
      activeMobileTab={activeMobileTab}
      chats={visibleChats}
      isHost={isHost}
      miniPlayerCommandError={shouldShowPreviewData ? null : miniPlayerControls.commandError}
      miniPlayerControlDisabled={
        shouldShowPreviewData ? !miniPlayerHasPlayableTrack : miniPlayerControls.controlDisabled
      }
      miniPlayerIsMuted={miniPlayerIsMuted}
      miniPlayerNextDisabled={!nextItem}
      miniPlayerPendingCommand={shouldShowPreviewData ? null : miniPlayerControls.pendingCommand}
      miniPlayerPreviousDisabled={!previousItem}
      miniPlayerVolume={miniPlayerVolume}
      members={visibleMembers}
      onMuteToggle={toggleMiniPlayerMute}
      onMiniPlayerNextTrack={
        shouldShowPreviewData
          ? () => handlePreviewTrackChange(nextItem)
          : miniPlayerControls.handleNextTrack
      }
      onMiniPlayerPlayPause={
        shouldShowPreviewData ? handlePreviewPlayPause : miniPlayerControls.handlePlayPause
      }
      onMiniPlayerPreviousTrack={
        shouldShowPreviewData
          ? () => handlePreviewTrackChange(previousItem)
          : miniPlayerControls.handlePreviousTrack
      }
      onMiniPlayerVolumeChange={setMiniPlayerVolume}
      onMobileTabChange={setActiveMobileTab}
      playbackState={visiblePlaybackState}
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
          playlistApiClient={shouldShowPreviewData ? roomPreviewPlaylistApi : undefined}
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

function createPreviewPlaybackState(track: PlaylistItem, isPlaying: boolean): PlaybackState {
  return {
    currentTime: 0,
    isPlaying,
    playlistItemId: track.id,
    videoId: track.videoId,
  };
}

function isCurrentUserHost(members: RoomMember[], currentUserId: string | null) {
  if (!currentUserId) {
    return false;
  }

  return members.some((member) => member.userId === currentUserId && member.role === 'host');
}
