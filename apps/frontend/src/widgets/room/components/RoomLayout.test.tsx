// 반응형 RoomLayout이 Player를 중복 mount하지 않고, 모바일 탭(재생목록/멤버/채팅)이
// 데스크톱용 인스턴스 + 모바일 오버레이(또는 페이지 내 패널) 인스턴스로만 구성되는지 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMobileOverlayHeight, RoomLayout } from './RoomLayout';

vi.mock('@/features/chat/components/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel" />,
}));

vi.mock('@/features/presence/components/MemberList', () => ({
  MemberList: () => <div data-testid="member-list" />,
}));

vi.mock('@/features/presence/components/KickedMembersButton', () => ({
  KickedMembersButton: () => <button type="button">추방 관리</button>,
}));

vi.mock('@/features/presence/components/MemberSidebar', () => ({
  MemberSidebar: () => <div data-testid="member-sidebar" />,
}));

vi.mock('./MobileTabs', () => ({
  MobileTabs: () => <div data-testid="mobile-tabs" />,
}));

// useTallEnoughForInlineTabPanel은 플레이어 슬롯의 실측 하단 Y좌표 + window.innerHeight로
// 남는 공간을 계산한다. jsdom은 실제 레이아웃을 계산하지 않아 getBoundingClientRect가
// 기본적으로 전부 0을 반환하므로, 대부분의 테스트가 기대하는 "좁은 뷰포트(오버레이)"를
// 기본값으로 명시적으로 고정해둔다.
const mockChromeSpace = (chromeBottom: number, viewportHeight: number) => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });
  // Radix 등 다른 내부 로직도 getBoundingClientRect를 쓸 수 있으므로, bottom 외의
  // 필드도 DOMRect 형태를 갖추도록 채워 undefined로 인한 부작용을 막는다.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: chromeBottom,
    height: 0,
    left: 0,
    right: 0,
    top: chromeBottom,
    width: 0,
    x: 0,
    y: chromeBottom,
    toJSON: () => ({}),
  } as DOMRect);
};

describe('RoomLayout', () => {
  beforeEach(() => {
    // 남는 공간 = 700 - 500 - 112(footer) = 88 < 304(threshold) → 좁은 뷰포트(오버레이)
    mockChromeSpace(500, 700);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(['playlist', 'members', 'chat', null] as const)(
    'activeMobileTab이 %s여도 Player는 항상 한 번만 렌더링한다',
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
    },
  );

  it('아무 탭도 선택되지 않으면(null) 모바일 오버레이도 페이지 내 패널도 뜨지 않는다', () => {
    render(
      <RoomLayout
        activeMobileTab={null}
        currentUserName="게스트"
        onMobileTabChange={vi.fn()}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={<div data-testid="playlist-panel" />}
        roomId="room-1"
      />,
    );

    expect(screen.queryByTestId('room-mobile-overlay')).not.toBeInTheDocument();
    expect(screen.queryByTestId('room-tall-viewport-panel')).not.toBeInTheDocument();
    // 데스크톱용 고정 슬롯 + 가로모드 패널(기본 탭인 재생목록) 인스턴스가 남는다.
    expect(screen.getAllByTestId('playlist-panel')).toHaveLength(2);
    expect(screen.getAllByTestId('chat-panel')).toHaveLength(1);
    expect(screen.queryByTestId('member-list')).not.toBeInTheDocument();
  });

  it.each(['playlist', 'members', 'chat'] as const)(
    '좁은 뷰포트의 %s 탭에서는 오버레이 안에서도 해당 탭 컨텐츠를 렌더링한다',
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

      expect(screen.getByTestId('room-mobile-overlay')).toBeInTheDocument();
      // 플레이어 아래 가용 공간(88px)을 넘지 않도록 높이가 축소된다.
      expect(screen.getByTestId('room-mobile-overlay')).toHaveStyle({ height: '88px' });
      // 오버레이는 화면 전체를 덮지 않으므로 뒤로 돌아갈 수 있는 닫기(X) 버튼이 필요하다.
      expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
      expect(screen.queryByTestId('room-tall-viewport-panel')).not.toBeInTheDocument();

      const testIdByTab = {
        playlist: 'playlist-panel',
        members: 'member-list',
        chat: 'chat-panel',
      } as const;
      // 데스크톱용 고정 슬롯 인스턴스 1개 + 모바일 오버레이 인스턴스 1개, 재생목록은
      // 가로모드 패널의 기본 탭이라 인스턴스가 하나 더 있다(데스크톱 슬롯 + 가로모드
      // 패널 + 모바일 오버레이).
      const expectedCountByTab = { playlist: 3, members: 1, chat: 2 } as const;
      expect(screen.getAllByTestId(testIdByTab[activeMobileTab])).toHaveLength(
        expectedCountByTab[activeMobileTab],
      );
    },
  );

  it('세로 공간이 넉넉한 뷰포트에서는 오버레이 대신 페이지 흐름 안에 탭 컨텐츠를 렌더링한다', () => {
    // 남는 공간 = 1200 - 300 - 112(footer) = 788 >= 304(threshold) → 넉넉한 뷰포트(인라인)
    mockChromeSpace(300, 1200);

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
    // 인라인 패널은 페이지 흐름의 일부라 닫아도 보여줄 게 없으므로 닫기(X) 버튼이 없다.
    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
  });

  it('모바일 멤버 패널 헤더에 추방 관리 버튼을 배치한다', () => {
    render(
      <RoomLayout
        activeMobileTab="members"
        currentUserName="게스트"
        onMobileTabChange={vi.fn()}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={<div data-testid="playlist-panel" />}
        roomId="room-1"
      />,
    );

    expect(screen.getByRole('button', { name: '추방 관리' })).toBeInTheDocument();
  });

  it('가로모드 사이드 패널은 작은 화면에서만 좁아지고 기본 탭은 재생목록이다', () => {
    render(
      <RoomLayout
        activeMobileTab={null}
        currentUserName="게스트"
        onMobileTabChange={vi.fn()}
        playerPanel={<div data-testid="player-panel" />}
        playlistPanel={<div data-testid="playlist-panel" />}
        roomId="room-1"
      />,
    );

    const landscapePanel = screen.getByTestId('room-landscape-panel');
    expect(landscapePanel).toBeInTheDocument();
    expect(landscapePanel).toHaveClass('max-xl:landscape:flex');
    expect(landscapePanel).toHaveClass('max-[767px]:landscape:w-64');
    expect(landscapePanel).toHaveClass('min-[768px]:max-xl:landscape:w-room-side');
    expect(screen.getByTestId('room-player-slot')).toHaveClass('max-xl:landscape:flex');
    expect(screen.getAllByTestId('playlist-panel').some((el) => landscapePanel.contains(el))).toBe(
      true,
    );
    expect(screen.queryByTestId('member-list')).not.toBeInTheDocument();
  });

  it('오버레이 높이를 플레이어 아래 가용 공간과 목표 높이 중 작은 값으로 제한한다', () => {
    expect(getMobileOverlayHeight(600)).toBe(328);
    expect(getMobileOverlayHeight(88)).toBe(88);
    expect(getMobileOverlayHeight(-10)).toBe(0);
  });
});
