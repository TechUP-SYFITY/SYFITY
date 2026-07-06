'use client';

// Room 화면의 PC와 모바일 레이아웃을 features 컴포넌트로 조립한다.
import type { ReactNode } from 'react';

import type {
  ChatMessage,
  PlaybackState,
  PlaylistItem,
  RoomDetail,
  RoomMember,
} from '@/shared/types/domain';

import { MiniPlayer } from './components/MiniPlayer';
import type { RoomMobileTab } from './components/MobileTabs';
import { RoomDesktopLayout } from './components/RoomDesktopLayout';
import { RoomHeader } from './components/RoomHeader';
import { RoomMobileLayout } from './components/RoomMobileLayout';
import { RoomStatusBar } from './components/RoomStatusBar';

export type { RoomMobileTab } from './components/MobileTabs';

interface RoomShellProps {
  activeMobileTab: RoomMobileTab;
  chats: ChatMessage[];
  currentUserName?: string;
  isHost: boolean;
  members: RoomMember[];
  onInviteClick?: () => void;
  onMobileTabChange: (tab: RoomMobileTab) => void;
  playbackState: PlaybackState | null;
  playlist: PlaylistItem[];
  renderPlayerPanel: () => ReactNode;
  renderPlaylistPanel: () => ReactNode;
  room: RoomDetail | null;
}

export function RoomShell({
  activeMobileTab,
  chats,
  currentUserName = '민지',
  isHost,
  members,
  onInviteClick,
  onMobileTabChange,
  playbackState,
  playlist,
  renderPlayerPanel,
  renderPlaylistPanel,
  room,
}: RoomShellProps) {
  const currentTrack =
    playlist.find((item) => item.id === playbackState?.playlistItemId) ?? playlist[0];
  const onlineMemberCount = members.filter((member) => member.status === 'online').length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="flex min-h-screen flex-col">
        <RoomHeader currentUserName={currentUserName} />
        <RoomStatusBar
          onInviteClick={onInviteClick}
          onlineMemberCount={onlineMemberCount}
          room={room}
        />
        <RoomDesktopLayout
          chats={chats}
          members={members}
          renderPlayerPanel={renderPlayerPanel}
          renderPlaylistPanel={renderPlaylistPanel}
        />
        <RoomMobileLayout
          activeMobileTab={activeMobileTab}
          chats={chats}
          isHost={isHost}
          members={members}
          onMobileTabChange={onMobileTabChange}
          renderPlayerPanel={renderPlayerPanel}
          renderPlaylistPanel={renderPlaylistPanel}
        />

        <MiniPlayer currentTrack={currentTrack} isPlaying={playbackState?.isPlaying ?? false} />
      </div>
    </main>
  );
}
