'use client';

// Room의 공통 Player와 Playlist를 한 번만 렌더링하고 반응형 영역을 배치한다.
// 모바일 탭(재생목록·멤버·채팅)은 플레이어 아래로 남는 공간에 따라 두 가지로 보인다:
// 공간이 충분하면 페이지 흐름 안에서 그 공간을 그대로 채우고(showInPageMobilePanel,
// 닫을 필요가 없으므로 X 버튼 없음), 부족하면 화면 하단에 고정 크기(MOBILE_TAB_PANEL_TOTAL_HEIGHT)
// 바텀시트로 덮어 띄운다(모바일 오버레이, 화면 전체를 덮지 않아 비디오는 계속 보임).
// 비디오를 display:none/unmount하면 iOS에서 재생(오디오)이 끊길 수 있어, 어느 모드든
// 항상 mount된 상태를 유지하고 배치만 바꾼다.
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useRef, type ReactNode } from 'react';

import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { KickedMembersButton } from '@/features/presence/components/KickedMembersButton';
import { MemberList } from '@/features/presence/components/MemberList';
import { MemberSidebar } from '@/features/presence/components/MemberSidebar';

import { MobileTabs, type RoomMobileTab } from './MobileTabs';
import {
  TAB_PANEL_HEIGHT,
  useTallEnoughForInlineTabPanel,
} from '../hooks/useTallEnoughForInlineTabPanel';

// MobileOverlayHeader의 h-12.
const MOBILE_OVERLAY_HEADER_HEIGHT = 48;
// 탭 패널의 고정 총높이(헤더+콘텐츠). 인라인일 때도 이 이상 늘어나지 않고,
// 오버레이일 때도 화면 하단에 이 높이만큼만 붙는 단일 기준값이다.
const MOBILE_TAB_PANEL_TOTAL_HEIGHT = MOBILE_OVERLAY_HEADER_HEIGHT + TAB_PANEL_HEIGHT;

interface RoomLayoutProps {
  activeMobileTab: RoomMobileTab | null;
  currentUserName: string;
  currentUserProfileImage?: string | null;
  onMobileTabChange: (tab: RoomMobileTab | null) => void;
  playerPanel: ReactNode;
  playlistPanel: ReactNode;
  roomId: string;
}

const MOBILE_OVERLAY_TITLE: Record<RoomMobileTab, string> = {
  playlist: '재생목록',
  members: '멤버',
  chat: '채팅',
};

function MobileOverlayHeader({
  action,
  title,
  onClose,
}: {
  action?: ReactNode;
  title: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      <div className="flex items-center gap-1">
        {action}
        {onClose ? (
          <button
            aria-label="닫기"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RoomLayout({
  activeMobileTab,
  currentUserName,
  currentUserProfileImage,
  onMobileTabChange,
  playerPanel,
  playlistPanel,
  roomId,
}: RoomLayoutProps) {
  const playerSlotRef = useRef<HTMLDivElement>(null);
  const isTallViewport = useTallEnoughForInlineTabPanel(playerSlotRef);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const isMobileOverlayOpen = activeMobileTab !== null && !isTallViewport;
  const showInPageMobilePanel = activeMobileTab !== null && isTallViewport;
  const closeMobileTab = () => onMobileTabChange(null);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border xl:flex-row">
      <div className="hidden w-room-members shrink-0 self-stretch xl:flex">
        <MemberSidebar />
      </div>

      <div
        className="shrink-0 px-5 py-4 xl:min-w-0 xl:flex-1 xl:self-stretch xl:border-r xl:border-border xl:p-6"
        data-testid="room-player-slot"
        ref={playerSlotRef}
      >
        {playerPanel}
      </div>

      <div
        className="hidden xl:flex xl:min-h-0 xl:w-room-side xl:flex-none xl:shrink-0 xl:self-stretch xl:overflow-hidden"
        data-testid="room-playlist-slot"
      >
        {playlistPanel}
      </div>

      {showInPageMobilePanel ? (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border pb-28 xl:hidden"
          data-testid="room-tall-viewport-panel"
        >
          <MobileOverlayHeader
            action={activeMobileTab === 'members' ? <KickedMembersButton /> : undefined}
            title={MOBILE_OVERLAY_TITLE[activeMobileTab]}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeMobileTab === 'playlist' ? playlistPanel : null}
            {activeMobileTab === 'members' ? (
              <div className="h-full overflow-y-auto">
                <MemberList />
              </div>
            ) : null}
            {activeMobileTab === 'chat' ? (
              <ChatPanel
                currentUserName={currentUserName}
                currentUserProfileImage={currentUserProfileImage}
                roomId={roomId}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="hidden w-room-side min-w-0 shrink-0 self-stretch xl:flex">
        <ChatPanel
          currentUserName={currentUserName}
          currentUserProfileImage={currentUserProfileImage}
          roomId={roomId}
        />
      </div>

      {/* 탭 전환 버튼: 오버레이보다 항상 위(z-40)에 떠서 오버레이가 열려있어도 누를 수 있다.
          아래 DialogPrimitive.Content의 onInteractOutside에서 이 영역(tabBarRef)은 "바깥 상호작용"에서
          제외해야 한다 — 안 그러면 탭을 누르는 pointerdown 자체가 먼저 다이얼로그를 닫아버리고,
          뒤이은 click이 다시 다른 탭을 열면서 열림/닫힘이 겹쳐 깜빡이는 레이스가 생긴다. */}
      <div className="fixed inset-x-0 bottom-16 z-40 xl:hidden" ref={tabBarRef}>
        <MobileTabs activeTab={activeMobileTab} onChange={onMobileTabChange} />
      </div>

      {/* modal=false: 백그라운드(탭 바)를 aria-hidden/inert 처리하지 않아 오버레이 중에도 탭 전환이 가능해야 함 */}
      <DialogPrimitive.Root
        open={isMobileOverlayOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeMobileTab();
          }
        }}
        modal={false}
      >
        <DialogPrimitive.Content
          className="absolute inset-x-0 bottom-28 z-30 flex flex-col overflow-hidden rounded-t-2xl bg-background outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom xl:hidden"
          data-testid="room-mobile-overlay"
          style={{ height: MOBILE_TAB_PANEL_TOTAL_HEIGHT }}
          onInteractOutside={(event) => {
            const target = event.detail.originalEvent.target as Node | null;
            if (target && tabBarRef.current?.contains(target)) {
              event.preventDefault();
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {activeMobileTab ? MOBILE_OVERLAY_TITLE[activeMobileTab] : ''}
          </DialogPrimitive.Title>
          {activeMobileTab ? (
            <>
              <MobileOverlayHeader
                action={activeMobileTab === 'members' ? <KickedMembersButton /> : undefined}
                title={MOBILE_OVERLAY_TITLE[activeMobileTab]}
                onClose={closeMobileTab}
              />
              {activeMobileTab === 'playlist' ? playlistPanel : null}
              {activeMobileTab === 'members' ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <MemberList />
                </div>
              ) : null}
              {activeMobileTab === 'chat' ? (
                <ChatPanel
                  currentUserName={currentUserName}
                  currentUserProfileImage={currentUserProfileImage}
                  roomId={roomId}
                />
              ) : null}
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Root>
    </section>
  );
}
