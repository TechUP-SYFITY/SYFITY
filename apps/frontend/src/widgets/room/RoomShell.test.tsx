// RoomShell이 현재 viewport에 필요한 레이아웃과 Player만 렌더링하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomShell } from './RoomShell';

vi.mock('@/shared/components/layout', () => ({
  Header: () => null,
}));

vi.mock('@/features/room/components/MiniPlayer', () => ({
  MiniPlayer: () => null,
}));

vi.mock('@/features/room/components/RoomStatusBar', () => ({
  RoomStatusBar: () => null,
}));

vi.mock('./components/RoomLayout', () => ({
  RoomLayout: ({ renderPlayerPanel }: { renderPlayerPanel: () => ReactNode }) => (
    <div data-testid="room-layout">{renderPlayerPanel()}</div>
  ),
}));

describe('RoomShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('viewport 판정 없이 Player panel을 한 번만 렌더링한다', () => {
    const renderPlayerPanel = vi.fn(() => <div data-testid="player-panel" />);

    render(
      <RoomShell
        activeMobileTab="playlist"
        chats={[]}
        isHost
        members={[]}
        miniPlayerCommandError={null}
        miniPlayerControlDisabled={false}
        miniPlayerIsMuted={false}
        miniPlayerNextDisabled
        miniPlayerPendingCommand={null}
        miniPlayerPreviousDisabled
        miniPlayerVolume={70}
        onMiniPlayerNextTrack={vi.fn()}
        onMiniPlayerPlayPause={vi.fn()}
        onMiniPlayerPreviousTrack={vi.fn()}
        onMiniPlayerSeek={vi.fn()}
        onMiniPlayerVolumeChange={vi.fn()}
        onMobileTabChange={vi.fn()}
        onMuteToggle={vi.fn()}
        playbackState={null}
        playlist={[]}
        renderPlayerPanel={renderPlayerPanel}
        renderPlaylistPanel={() => null}
        room={null}
      />,
    );

    expect(screen.getByTestId('room-layout')).toBeInTheDocument();
    expect(screen.getAllByTestId('player-panel')).toHaveLength(1);
    expect(renderPlayerPanel).toHaveBeenCalledTimes(1);
  });
});
