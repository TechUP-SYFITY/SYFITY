'use client';

// Room 입장 응답을 도메인 store에 반영하고, 화면 생명주기에 맞춰 실시간 연결을 관리한다.
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/shared/components/ui';
import type { RoomJoinedPayload, RoomKickedPayload } from '@/shared/types/socket';

import { useMe } from '@/features/auth/hooks/useAuth';
import { sortChatMessagesAscending } from '@/features/chat/lib/chatMessageOrder';
import { useChatStore } from '@/features/chat/store/chatStore';
import { usePlayerStore } from '@/features/player/store/playerStore';
import { usePlayerVolumeStore } from '@/features/player/store/playerVolumeStore';
import { usePlaylistStore } from '@/features/playlist/store/playlistStore';
import { usePresenceStore } from '@/features/presence/store/presenceStore';
import { useJoinRoom } from '@/features/room/hooks/roomHooks';
import { useRoomStore } from '@/features/room/store/roomStore';

import { useRoomLiveConnections } from './useRoomLiveConnections';

export function useRoomPageSession(roomId: string) {
  const router = useRouter();
  const { pushToast } = useToast();
  const handledKickedRoomIdRef = useRef<string | null>(null);
  const [disabledRoomId, setDisabledRoomId] = useState<string | null>(null);
  const joinRoom = useJoinRoom(roomId);
  const { data: me, isError: isMeError } = useMe();
  const hostConnection = useRoomStore((state) => state.hostConnection);
  const hasJoinedRoom = useRoomStore((state) => state.hasJoinedRoom && state.room?.id === roomId);
  const room = useRoomStore((state) => state.room);
  const setJoinedRoom = useRoomStore((state) => state.setJoinedRoom);
  const onlineMemberCount = usePresenceStore(
    (state) => state.members.filter((member) => member.status === 'online').length,
  );
  const setMembers = usePresenceStore((state) => state.setMembers);
  const clearMembers = usePresenceStore((state) => state.clearMembers);
  const localPlaybackPosition = usePlayerStore((state) => state.localPlaybackPosition);
  const setPlaybackState = usePlayerStore((state) => state.setPlaybackState);
  const clearPlayback = usePlayerStore((state) => state.clearPlayback);
  const playbackState = usePlayerStore((state) => state.playbackState);
  const playbackPolicy = usePlayerStore((state) => state.playbackPolicy);
  const setPlaybackPolicy = usePlayerStore((state) => state.setPlaybackPolicy);
  const isMuted = usePlayerVolumeStore((state) => state.isMuted);
  const setVolume = usePlayerVolumeStore((state) => state.setVolume);
  const toggleMuted = usePlayerVolumeStore((state) => state.toggleMuted);
  const volume = usePlayerVolumeStore((state) => state.volume);
  const playlist = usePlaylistStore((state) => state.playlist);
  const setPlaylist = usePlaylistStore((state) => state.setPlaylist);
  const clearPlaylist = usePlaylistStore((state) => state.clearPlaylist);
  const setMessages = useChatStore((state) => state.setMessages);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const clearRoom = useRoomStore((state) => state.clearRoom);

  const exitRoom = useCallback(() => {
    clearMessages();
    clearMembers();
    clearPlayback();
    clearPlaylist();
    clearRoom();
    router.replace('/home');
  }, [clearMembers, clearMessages, clearPlayback, clearPlaylist, clearRoom, router]);

  const handleRoomClosed = useCallback(() => {
    pushToast({
      id: 'room-closed',
      title: 'Room이 종료되었습니다.',
      variant: 'info',
    });
    exitRoom();
  }, [exitRoom, pushToast]);

  const handleRoomKicked = useCallback(
    (payload: RoomKickedPayload) => {
      if (handledKickedRoomIdRef.current === payload.roomId) {
        return;
      }

      handledKickedRoomIdRef.current = payload.roomId;
      setDisabledRoomId(payload.roomId);
      clearRoom();
      clearMembers();
      clearPlaylist();
      clearPlayback();
      clearMessages();
      pushToast({
        id: `room-kicked-${payload.roomId}`,
        title: payload.message,
        variant: 'error',
      });
      router.replace('/home');
    },
    [clearMembers, clearMessages, clearPlayback, clearPlaylist, clearRoom, pushToast, router],
  );

  const handleSnapshot = useCallback(
    (snapshot: RoomJoinedPayload) => {
      if (!joinRoom.data || handledKickedRoomIdRef.current === snapshot.roomId) {
        return;
      }

      setJoinedRoom(joinRoom.data.room);
      setMembers(snapshot.members);
      setPlaylist(snapshot.playlist);
      setPlaybackState(snapshot.playbackState, 'room-join');
      setPlaybackPolicy(snapshot.playbackPolicy);
      setMessages(sortChatMessagesAscending(snapshot.recentChats));
    },
    [
      joinRoom.data,
      setJoinedRoom,
      setMembers,
      setMessages,
      setPlaybackPolicy,
      setPlaybackState,
      setPlaylist,
    ],
  );

  useRoomLiveConnections(
    roomId,
    joinRoom.isSuccess && disabledRoomId !== roomId,
    handleRoomClosed,
    handleSnapshot,
    handleRoomKicked,
  );

  return {
    exitClosedRoom: handleRoomClosed,
    exitRoom,
    hasJoinedRoom,
    hostConnection,
    isMuted,
    isMeError,
    joinRoom,
    localPlaybackPosition,
    me,
    onlineMemberCount,
    playbackState,
    playbackPolicy,
    playlist,
    room,
    setVolume,
    toggleMuted,
    volume,
  };
}
