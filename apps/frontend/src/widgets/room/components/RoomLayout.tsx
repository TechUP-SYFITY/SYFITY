'use client';

// Room의 공통 Player와 Playlist를 한 번만 렌더링하고 반응형 영역을 배치한다.
// 모바일에서는 chat/members를 비디오 위를 덮는 오버레이로 띄운다 — 비디오를
// display:none/unmount하면 iOS에서 재생(오디오)이 끊길 수 있어, 항상 mount된
// 상태를 유지하고 시각적으로만 가리는 방식을 쓴다.
// 다만 세로 공간이 충분한 기기(태블릿 세로모드 등)에서는 오버레이 없이도
// 비디오+탭 콘텐츠를 한 화면에 다 보여줄 여유가 있어, 뷰포트 높이가 임계값
// 이상이면 오버레이 대신 기존 방식(페이지 흐름 안에 그대로 표시)으로 전환한다.
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

import { useMediaQuery } from '@/shared/hooks/useMediaQuery';
import { cn } from '@/shared/lib/utils';

import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { MemberList } from '@/features/presence/components/MemberList';
import { MemberSidebar } from '@/features/presence/components/MemberSidebar';
import { MobileTabs, type RoomMobileTab } from '@/features/room/components/MobileTabs';

interface RoomLayoutProps {
  activeMobileTab: RoomMobileTab;
  currentUserName: string;
  currentUserProfileImage?: string | null;
  onMobileTabChange: (tab: RoomMobileTab) => void;
  renderPlayerPanel: () => ReactNode;
  renderPlaylistPanel: () => ReactNode;
  roomId: string;
}

const MOBILE_OVERLAY_TITLE: Record<Exclude<RoomMobileTab, 'playlist'>, string> = {
  members: '멤버',
  chat: '채팅',
};

// 비디오(≈200~220px) + 헤더/탭바/미니플레이어 등 고정 UI를 빼고도 채팅 목록이
// 여유 있게 보이는 최소 뷰포트 높이. 이 이상이면 오버레이 없이 페이지 흐름대로 보여준다.
const TALL_VIEWPORT_QUERY = '(min-height: 900px)';

export function RoomLayout({
  activeMobileTab,
  currentUserName,
  currentUserProfileImage,
  onMobileTabChange,
  renderPlayerPanel,
  renderPlaylistPanel,
  roomId,
}: RoomLayoutProps) {
  const isTallViewport = useMediaQuery(TALL_VIEWPORT_QUERY);
  const isMobileOverlayOpen = activeMobileTab !== 'playlist' && !isTallViewport;
  const showInPageMobilePanel = activeMobileTab !== 'playlist' && isTallViewport;

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border xl:flex-row">
      <div className="hidden w-room-members shrink-0 self-stretch xl:flex">
        <MemberSidebar />
      </div>

      <div
        className="shrink-0 px-5 py-4 xl:min-w-0 xl:flex-1 xl:self-stretch xl:border-r xl:border-border xl:px-6 xl:py-6"
        data-testid="room-player-slot"
      >
        {renderPlayerPanel()}
      </div>

      <div
        className={cn(
          'min-h-0 flex-1 scrollbar-none overflow-y-auto border-t border-border pb-28',
          activeMobileTab === 'playlist' ? 'flex' : 'hidden',
          'xl:flex xl:w-room-side xl:flex-none xl:shrink-0 xl:self-stretch xl:overflow-hidden xl:border-t-0 xl:pb-0',
        )}
        data-testid="room-playlist-slot"
      >
        {renderPlaylistPanel()}
      </div>

      {showInPageMobilePanel ? (
        <div
          className="min-h-0 flex-1 overflow-hidden border-t border-border pb-28 xl:hidden"
          data-testid="room-tall-viewport-panel"
        >
          {activeMobileTab === 'members' ? <MemberList /> : null}
          {activeMobileTab === 'chat' ? (
            <ChatPanel
              currentUserName={currentUserName}
              currentUserProfileImage={currentUserProfileImage}
              roomId={roomId}
            />
          ) : null}
        </div>
      ) : null}

      <div className="hidden w-room-side min-w-0 shrink-0 self-stretch xl:flex">
        <ChatPanel
          currentUserName={currentUserName}
          currentUserProfileImage={currentUserProfileImage}
          roomId={roomId}
        />
      </div>

      {/* 탭 전환 버튼: 오버레이보다 항상 위(z-40)에 떠서 chat/members가 열려있어도 누를 수 있다. */}
      <div className="fixed inset-x-0 bottom-16 z-40 xl:hidden">
        <MobileTabs activeTab={activeMobileTab} onChange={onMobileTabChange} />
      </div>

      {/* modal=false: 백그라운드(탭 바)를 aria-hidden/inert 처리하지 않아 오버레이 중에도 탭 전환이 가능해야 함 */}
      <DialogPrimitive.Root
        open={isMobileOverlayOpen}
        onOpenChange={(open) => {
          if (!open) {
            onMobileTabChange('playlist');
          }
        }}
        modal={false}
      >
        <DialogPrimitive.Content
          className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-background pb-28 outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom xl:hidden"
          data-testid="room-mobile-overlay"
        >
          <DialogPrimitive.Title className="sr-only">
            {activeMobileTab === 'playlist' ? '' : MOBILE_OVERLAY_TITLE[activeMobileTab]}
          </DialogPrimitive.Title>
          {activeMobileTab === 'members' ? <MemberList /> : null}
          {activeMobileTab === 'chat' ? (
            <ChatPanel
              currentUserName={currentUserName}
              currentUserProfileImage={currentUserProfileImage}
              roomId={roomId}
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </section>
  );
}
