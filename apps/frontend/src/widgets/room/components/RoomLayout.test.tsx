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

vi.mock('./MobileTabs', () => ({
  MobileTabs: () => <div data-testid="mobile-tabs" />,
}));

describe('RoomLayout', () => {
  afterEach(cleanup);

  it.each(['playlist', 'members', 'chat'] as const)(
    '%s 탭에서도 Player와 Playlist를 각각 한 번만 렌더링한다',
    (activeMobileTab) => {
      render(
        <RoomLayout
          activeMobileTab={activeMobileTab}
          currentUserName="게스트"
          onMobileTabChange={vi.fn()}
          playerPanel={<div data-testid="player-panel" />}
          playlistPanel={<div data-testid="playlist-panel" />}
          roomId="room-1"
        />,
      );

      expect(screen.getAllByTestId('player-panel')).toHaveLength(1);
      expect(screen.getAllByTestId('playlist-panel')).toHaveLength(1);
    },
  );

  it('좁은 뷰포트의 chat 탭에서는 오버레이 안에서 ChatPanel을 렌더링한다 (데스크톱용 인스턴스 1개 + 모바일 오버레이 1개)', () => {
    render(
      <RoomLayout
        activeMobileTab="chat"
        currentUserName="게스트"
        onMobileTabChange={vi.fn()}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={<div data-testid="playlist-panel" />}
        roomId="room-1"
      />,
    );

    expect(screen.getAllByTestId('chat-panel')).toHaveLength(2);
    expect(screen.queryByTestId('room-tall-viewport-panel')).not.toBeInTheDocument();
  });

  it('세로 공간이 넉넉한 뷰포트에서는 오버레이 대신 페이지 흐름 안에 ChatPanel을 렌더링한다 (데스크톱용 인스턴스 1개 + 페이지 내 패널 1개)', () => {
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: true,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );

    render(
      <RoomLayout
        activeMobileTab="chat"
        currentUserName="게스트"
        onMobileTabChange={vi.fn()}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={<div data-testid="playlist-panel" />}
        roomId="room-1"
      />,
    );

    expect(screen.getByTestId('room-tall-viewport-panel')).toBeInTheDocument();
    expect(screen.getAllByTestId('chat-panel')).toHaveLength(2);
    expect(screen.queryByTestId('room-mobile-overlay')).not.toBeInTheDocument();

    matchMediaSpy.mockRestore();
  });
});
