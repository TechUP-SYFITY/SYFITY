// RoomShell이 현재 viewport에 필요한 레이아웃과 Player만 렌더링하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomShell } from './RoomShell';

vi.mock('@/shared/components/layout', () => ({
  Header: ({ containerClassName }: { containerClassName?: string }) => (
    <div data-class-name={containerClassName} data-testid="room-header" />
  ),
}));

vi.mock('@/features/player/components/MiniPlayer', () => ({
  MiniPlayer: () => null,
}));

vi.mock('@/features/room/components/HostConnectionNotice', () => ({
  HostConnectionNotice: () => <div data-testid="host-connection-notice" />,
}));

vi.mock('./components/RoomStatusBar', () => ({
  RoomStatusBar: () => null,
}));

vi.mock('./components/RoomLayout', () => ({
  RoomLayout: ({ playerPanel }: { playerPanel: ReactNode }) => (
    <div data-testid="room-layout">{playerPanel}</div>
  ),
}));

describe('RoomShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('viewport 판정 없이 Player panel을 한 번만 렌더링한다', () => {
    render(
      <RoomShell
        activeMobileTab="playlist"
        hostConnection={{ status: 'connected' }}
        isHost
        miniPlayerCommandError={null}
        miniPlayerControlDisabled={false}
        miniPlayerIsLocalSyncPaused={false}
        miniPlayerIsMuted={false}
        miniPlayerNextDisabled
        miniPlayerPendingCommand={null}
        miniPlayerPlayPauseDisabled={false}
        miniPlayerPreviousDisabled
        miniPlayerVolume={70}
        onMiniPlayerNextTrack={vi.fn()}
        onMiniPlayerPlayPause={vi.fn()}
        onMiniPlayerPreviousTrack={vi.fn()}
        onMiniPlayerSeek={vi.fn()}
        onMiniPlayerVolumeChange={vi.fn()}
        onMobileTabChange={vi.fn()}
        onMuteToggle={vi.fn()}
        onlineMemberCount={0}
        playbackState={null}
        playlist={[]}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={null}
        room={null}
        roomId="room-1"
      />,
    );

    expect(screen.getByTestId('room-layout')).toBeInTheDocument();
    expect(screen.getAllByTestId('player-panel')).toHaveLength(1);
    expect(screen.queryByTestId('host-connection-notice')).not.toBeInTheDocument();
  });

  it('Host 연결이 끊기면 PC와 모바일 공통 위치에 안내를 표시한다', () => {
    render(
      <RoomShell
        activeMobileTab="playlist"
        hostConnection={{ status: 'disconnected', waitUntil: '2026-07-13T08:00:00.000Z' }}
        isHost={false}
        miniPlayerCommandError={null}
        miniPlayerControlDisabled
        miniPlayerIsLocalSyncPaused={false}
        miniPlayerIsMuted={false}
        miniPlayerNextDisabled
        miniPlayerPendingCommand={null}
        miniPlayerPlayPauseDisabled={false}
        miniPlayerPreviousDisabled
        miniPlayerVolume={70}
        onMiniPlayerNextTrack={vi.fn()}
        onMiniPlayerPlayPause={vi.fn()}
        onMiniPlayerPreviousTrack={vi.fn()}
        onMiniPlayerSeek={vi.fn()}
        onMiniPlayerVolumeChange={vi.fn()}
        onMobileTabChange={vi.fn()}
        onMuteToggle={vi.fn()}
        onlineMemberCount={0}
        playbackState={null}
        playlist={[]}
        playerPanel={null}
        playlistPanel={null}
        room={null}
        roomId="room-1"
      />,
    );

    expect(screen.getByTestId('host-connection-notice')).toBeInTheDocument();
  });

  it('데스크톱 헤더 축소는 xl 미만 가로모드에만 적용한다', () => {
    render(
      <RoomShell
        activeMobileTab={null}
        hostConnection={{ status: 'connected' }}
        isHost={false}
        miniPlayerCommandError={null}
        miniPlayerControlDisabled={false}
        miniPlayerIsLocalSyncPaused={false}
        miniPlayerIsMuted={false}
        miniPlayerNextDisabled
        miniPlayerPendingCommand={null}
        miniPlayerPlayPauseDisabled={false}
        miniPlayerPreviousDisabled
        miniPlayerVolume={70}
        onMiniPlayerNextTrack={vi.fn()}
        onMiniPlayerPlayPause={vi.fn()}
        onMiniPlayerPreviousTrack={vi.fn()}
        onMiniPlayerSeek={vi.fn()}
        onMiniPlayerVolumeChange={vi.fn()}
        onMobileTabChange={vi.fn()}
        onMuteToggle={vi.fn()}
        onlineMemberCount={0}
        playbackState={null}
        playlist={[]}
        playerPanel={null}
        playlistPanel={null}
        room={null}
        roomId="room-1"
      />,
    );

    expect(screen.getByTestId('room-header')).toHaveAttribute(
      'data-class-name',
      'max-xl:landscape:h-10 xl:h-16',
    );
  });
});
