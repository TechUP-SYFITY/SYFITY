// 반응형 RoomLayout이 Player와 Playlist를 중복 mount하지 않는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomLayout } from './RoomLayout';

vi.mock('@/features/chat/components/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
}));

vi.mock('@/features/presence/components/MemberList', () => ({
  MemberList: () => <div data-testid="member-list" />,
}));

vi.mock('@/features/presence/components/MemberSidebar', () => ({
  MemberSidebar: () => <div data-testid="member-sidebar" />,
}));

vi.mock('@/features/room/components/HostConnectionNotice', () => ({
  HostConnectionNotice: () => <div data-testid="host-connection-notice" />,
}));

vi.mock('@/features/room/components/MobileTabs', () => ({
  MobileTabs: () => <div data-testid="mobile-tabs" />,
}));

describe('RoomLayout', () => {
  afterEach(cleanup);

  it.each(['playlist', 'members', 'chat'] as const)(
    '%s 탭에서도 Player와 Playlist를 각각 한 번만 렌더링한다',
    (activeMobileTab) => {
      const renderPlayerPanel = vi.fn(() => <div data-testid="player-panel" />);
      const renderPlaylistPanel = vi.fn(() => <div data-testid="playlist-panel" />);

      render(
        <RoomLayout
          activeMobileTab={activeMobileTab}
          chats={[]}
          currentUserName="게스트"
          isHost
          members={[]}
          onMobileTabChange={vi.fn()}
          renderPlayerPanel={renderPlayerPanel}
          renderPlaylistPanel={renderPlaylistPanel}
        />,
      );

      expect(screen.getAllByTestId('player-panel')).toHaveLength(1);
      expect(screen.getAllByTestId('playlist-panel')).toHaveLength(1);
      expect(renderPlayerPanel).toHaveBeenCalledTimes(1);
      expect(renderPlaylistPanel).toHaveBeenCalledTimes(1);
    },
  );
});
