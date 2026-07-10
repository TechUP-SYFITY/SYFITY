'use client';

// Room 화면의 PC와 모바일 레이아웃을 features 컴포넌트로 조립한다.
import { useSyncExternalStore, type ReactNode } from 'react';

import { Header } from '@/shared/components/layout';
import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type {
  ChatMessage,
  PlaybackState,
  PlaylistItem,
  RoomDetail,
  RoomMember,
} from '@/shared/types/domain';

import { MiniPlayer, type MiniPlayerPendingCommand } from '@/features/room/components/MiniPlayer';
import type { RoomMobileTab } from '@/features/room/components/MobileTabs';
import { RoomStatusBar } from '@/features/room/components/RoomStatusBar';

import { RoomDesktopLayout } from './components/RoomDesktopLayout';
import { RoomMobileLayout } from './components/RoomMobileLayout';

export type { RoomMobileTab } from '@/features/room/components/MobileTabs';

const DESKTOP_MEDIA_QUERY = '(min-width: 80rem)';

interface RoomShellProps {
  activeMobileTab: RoomMobileTab;
  chats: ChatMessage[];
  currentUserName?: string;
  headerActions?: ReactNode;
  isHost: boolean;
  miniPlayerCommandError: string | null;
  miniPlayerControlDisabled: boolean;
  miniPlayerIsMuted: boolean;
  miniPlayerNextDisabled: boolean;
  miniPlayerPendingCommand: MiniPlayerPendingCommand;
  miniPlayerPreviousDisabled: boolean;
  miniPlayerVolume: number;
  members: RoomMember[];
  onInviteClick?: () => void;
  onMuteToggle: () => void;
  onMiniPlayerNextTrack: () => void;
  onMiniPlayerPlayPause: () => void;
  onMiniPlayerPreviousTrack: () => void;
  onMiniPlayerSeek: (seekTime: number) => void;
  onMiniPlayerVolumeChange: (volume: number) => void;
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
  currentUserName = '게스트',
  headerActions,
  isHost,
  miniPlayerCommandError,
  miniPlayerControlDisabled,
  miniPlayerIsMuted,
  miniPlayerNextDisabled,
  miniPlayerPendingCommand,
  miniPlayerPreviousDisabled,
  miniPlayerVolume,
  members,
  onInviteClick,
  onMuteToggle,
  onMiniPlayerNextTrack,
  onMiniPlayerPlayPause,
  onMiniPlayerPreviousTrack,
  onMiniPlayerSeek,
  onMiniPlayerVolumeChange,
  onMobileTabChange,
  playbackState,
  playlist,
  renderPlayerPanel,
  renderPlaylistPanel,
  room,
}: RoomShellProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopViewport,
    getDesktopViewportSnapshot,
    getServerViewportSnapshot,
  );
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);
  const onlineMemberCount = members.filter((member) => member.status === 'online').length;

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        <Header variant="app" actions={headerActions} />
        <RoomStatusBar
          onInviteClick={onInviteClick}
          onlineMemberCount={onlineMemberCount}
          room={room}
        />
        {isDesktop ? (
          <RoomDesktopLayout
            chats={chats}
            members={members}
            renderPlayerPanel={renderPlayerPanel}
            renderPlaylistPanel={renderPlaylistPanel}
          />
        ) : (
          <RoomMobileLayout
            activeMobileTab={activeMobileTab}
            chats={chats}
            currentUserName={currentUserName}
            isHost={isHost}
            members={members}
            onMobileTabChange={onMobileTabChange}
            renderPlayerPanel={renderPlayerPanel}
            renderPlaylistPanel={renderPlaylistPanel}
          />
        )}

        <MiniPlayer
          commandError={miniPlayerCommandError}
          controlDisabled={miniPlayerControlDisabled}
          currentTrack={currentTrack}
          isHost={isHost}
          isMuted={miniPlayerIsMuted}
          nextDisabled={miniPlayerNextDisabled}
          onMuteToggle={onMuteToggle}
          onNextTrack={onMiniPlayerNextTrack}
          onPlayPause={onMiniPlayerPlayPause}
          onPreviousTrack={onMiniPlayerPreviousTrack}
          onSeek={onMiniPlayerSeek}
          onVolumeChange={onMiniPlayerVolumeChange}
          pendingCommand={miniPlayerPendingCommand}
          playbackState={playbackState}
          previousDisabled={miniPlayerPreviousDisabled}
          volume={miniPlayerVolume}
        />
      </div>
    </main>
  );
}

function subscribeToDesktopViewport(onStoreChange: () => void) {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getDesktopViewportSnapshot() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
    : false;
}

function getServerViewportSnapshot() {
  return false;
}
