'use client';

// Room 화면의 PC와 모바일 레이아웃을 features 컴포넌트로 조립한다.
import type { ReactNode } from 'react';

import { Header } from '@/shared/components/layout';
import { getCurrentPlaylistItem } from '@/shared/lib/playback';
import type { PlaybackState, PlaylistItem, RoomDetail } from '@/shared/types/domain';

import { MiniPlayer, type MiniPlayerPendingCommand } from '@/features/player/components/MiniPlayer';
import { HostConnectionNotice } from '@/features/room/components/HostConnectionNotice';
import type { RoomMobileTab } from '@/features/room/components/MobileTabs';
import { RoomStatusBar } from '@/features/room/components/RoomStatusBar';
import type { HostConnectionState } from '@/features/room/types/roomTypes';

import { RoomLayout } from './components/RoomLayout';

export type { RoomMobileTab } from '@/features/room/components/MobileTabs';

interface RoomShellProps {
  activeMobileTab: RoomMobileTab;
  currentUserName?: string;
  currentUserProfileImage?: string | null;
  headerActions?: ReactNode;
  hostConnection: HostConnectionState;
  isHost: boolean;
  miniPlayerCommandError: string | null;
  miniPlayerControlDisabled: boolean;
  miniPlayerIsMuted: boolean;
  miniPlayerNextDisabled: boolean;
  miniPlayerPendingCommand: MiniPlayerPendingCommand;
  miniPlayerPreviousDisabled: boolean;
  miniPlayerVolume: number;
  onlineMemberCount: number;
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
  roomId: string;
}

export function RoomShell({
  activeMobileTab,
  currentUserName = '게스트',
  currentUserProfileImage,
  headerActions,
  hostConnection,
  isHost,
  miniPlayerCommandError,
  miniPlayerControlDisabled,
  miniPlayerIsMuted,
  miniPlayerNextDisabled,
  miniPlayerPendingCommand,
  miniPlayerPreviousDisabled,
  miniPlayerVolume,
  onInviteClick,
  onMuteToggle,
  onMiniPlayerNextTrack,
  onMiniPlayerPlayPause,
  onMiniPlayerPreviousTrack,
  onMiniPlayerSeek,
  onMiniPlayerVolumeChange,
  onMobileTabChange,
  onlineMemberCount,
  playbackState,
  playlist,
  renderPlayerPanel,
  renderPlaylistPanel,
  room,
  roomId,
}: RoomShellProps) {
  const currentTrack = getCurrentPlaylistItem(playlist, playbackState);

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full min-h-0 flex-col">
        <Header variant="app" actions={headerActions} />
        <RoomStatusBar
          onInviteClick={onInviteClick}
          onlineMemberCount={onlineMemberCount}
          room={room}
        />
        {hostConnection.status === 'connected' ? null : (
          <HostConnectionNotice hostConnection={hostConnection} />
        )}
        <RoomLayout
          activeMobileTab={activeMobileTab}
          currentUserName={currentUserName}
          currentUserProfileImage={currentUserProfileImage}
          onMobileTabChange={onMobileTabChange}
          renderPlayerPanel={renderPlayerPanel}
          renderPlaylistPanel={renderPlaylistPanel}
          roomId={roomId}
        />

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
