// RoomShell이 현재 viewport에 필요한 레이아웃과 Player만 렌더링하는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomShell } from './RoomShell';

vi.mock('@/shared/components/layout', () => ({
  Header: () => null,
}));

vi.mock('./components/MiniPlayer', () => ({
  MiniPlayer: () => null,
}));

vi.mock('./components/RoomStatusBar', () => ({
  RoomStatusBar: () => null,
}));

vi.mock('./components/RoomDesktopLayout', () => ({
  RoomDesktopLayout: ({ renderPlayerPanel }: { renderPlayerPanel: () => ReactNode }) => (
    <div data-testid="desktop-layout">{renderPlayerPanel()}</div>
  ),
}));

vi.mock('./components/RoomMobileLayout', () => ({
  RoomMobileLayout: ({ renderPlayerPanel }: { renderPlayerPanel: () => ReactNode }) => (
    <div data-testid="mobile-layout">{renderPlayerPanel()}</div>
  ),
}));

describe('RoomShell', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    { isDesktop: true, visibleLayout: 'desktop-layout', hiddenLayout: 'mobile-layout' },
    { isDesktop: false, visibleLayout: 'mobile-layout', hiddenLayout: 'desktop-layout' },
  ])(
    '$visibleLayout viewport에서 Player panel을 한 번만 렌더링한다',
    ({ hiddenLayout, isDesktop, visibleLayout }) => {
      vi.stubGlobal('matchMedia', createMatchMedia(isDesktop));
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

      expect(screen.getByTestId(visibleLayout)).toBeInTheDocument();
      expect(screen.queryByTestId(hiddenLayout)).not.toBeInTheDocument();
      expect(screen.getAllByTestId('player-panel')).toHaveLength(1);
      expect(renderPlayerPanel).toHaveBeenCalledTimes(1);
    },
  );
});

function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    matches,
    removeEventListener: vi.fn(),
  }));
}
