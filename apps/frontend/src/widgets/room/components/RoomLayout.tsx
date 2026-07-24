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
import { useRef, useState, type ReactNode } from 'react';

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

export function getMobileOverlayHeight(availableSpace: number): number {
  return Math.max(0, Math.min(MOBILE_TAB_PANEL_TOTAL_HEIGHT, availableSpace));
}

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
  const { availableSpace, isTallEnough: isTallViewport } =
    useTallEnoughForInlineTabPanel(playerSlotRef);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const isMobileOverlayOpen = activeMobileTab !== null && !isTallViewport;
  const showInPageMobilePanel = activeMobileTab !== null && isTallViewport;
  const mobileOverlayHeight = getMobileOverlayHeight(availableSpace);
  const closeMobileTab = () => onMobileTabChange(null);

  // activeMobileTab이 null이 되는 순간 오버레이 안 콘텐츠(헤더·채팅/멤버/재생목록)가
  // 즉시 언마운트되면, 슬라이드 아웃 애니메이션이 도는 300ms 동안 빈 상자만 내려가는
  // 것처럼 보인다. 마지막으로 보여준 탭을 여기 저장해두고, 닫히는 동안에도 그 내용을
  // 계속 렌더링해 애니메이션이 끝날 때(오버레이가 실제로 언마운트될 때)까지 유지한다.
  const [renderedMobileTab, setRenderedMobileTab] = useState(activeMobileTab);
  if (activeMobileTab !== null && activeMobileTab !== renderedMobileTab) {
    setRenderedMobileTab(activeMobileTab);
  }

  // 가로모드(xl 미만)에서는 재생목록/멤버/채팅을 하단 오버레이 대신 플레이어 옆에
  // 항상 보이는 패널로 배치한다 — 세로 공간이 좁아 오버레이가 뜰 자리가 없기도 하고,
  // 폭도 844px 안팎이라 데스크톱(xl)처럼 3열을 동시에 띄우기엔 좁아 탭 하나로 묶는다.
  // activeMobileTab(세로모드 하단 탭 바 전용 상태)과는 독립적으로 관리한다.
  const [landscapeTab, setLandscapeTab] = useState<RoomMobileTab>('playlist');

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border xl:flex-row landscape:flex-row">
      <div className="hidden self-stretch xl:flex xl:min-w-56 xl:flex-1 xl:shrink">
        <MemberSidebar />
      </div>

      <div
        className="shrink-0 px-5 py-4 xl:min-w-0 xl:flex-[2] xl:shrink xl:self-stretch xl:border-r xl:border-border xl:p-6 max-xl:landscape:flex max-xl:landscape:min-w-0 max-xl:landscape:flex-1 max-xl:landscape:shrink max-xl:landscape:flex-col"
        data-testid="room-player-slot"
        ref={playerSlotRef}
      >
        {playerPanel}
      </div>

      <div
        className="hidden xl:flex xl:min-h-0 xl:min-w-64 xl:flex-1 xl:shrink xl:self-stretch xl:overflow-hidden"
        data-testid="room-playlist-slot"
      >
        {playlistPanel}
      </div>

      {/* 가로모드 전용 사이드 패널. xl에서는 위의 멤버·재생목록·채팅 열이 이미 동시에
          보이므로 이 패널은 필요 없다 — max-xl:landscape:로 "xl 미만이면서 가로모드"일
          때만 켠다(landscape:와 xl:는 서로 다른 미디어 특성이라 그냥 landscape:만 쓰면
          가로로 넓은 데스크톱에서도 함께 켜져버린다). 768px 미만에서는 256px로 좁혀
          356px Player가 확보할 폭을 남긴다. 하단 MiniPlayer(h-16, 전체 폭 fixed,
          z-40)가 이 패널 위에 겹쳐 뜨므로 그만큼(pb-16) 아래 여백을 비워 콘텐츠가
          가려지지 않게 한다. */}
      <div
        className="hidden max-[767px]:landscape:w-64 max-xl:landscape:flex max-xl:landscape:min-h-0 max-xl:landscape:flex-none max-xl:landscape:flex-col max-xl:landscape:overflow-hidden max-xl:landscape:border-l max-xl:landscape:border-border max-xl:landscape:pb-16 min-[768px]:max-xl:landscape:w-room-side"
        data-testid="room-landscape-panel"
      >
        <MobileTabs activeTab={landscapeTab} onChange={setLandscapeTab} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {landscapeTab === 'playlist' ? playlistPanel : null}
          {landscapeTab === 'members' ? (
            <div className="h-full overflow-y-auto">
              <MemberList />
            </div>
          ) : null}
          {landscapeTab === 'chat' ? (
            <ChatPanel
              currentUserName={currentUserName}
              currentUserProfileImage={currentUserProfileImage}
              roomId={roomId}
            />
          ) : null}
        </div>
      </div>

      {showInPageMobilePanel ? (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border pb-28 xl:hidden landscape:hidden"
          data-testid="room-tall-viewport-panel"
        >
          <MobileOverlayHeader
            action={activeMobileTab === 'members' ? <KickedMembersButton /> : undefined}
            title={MOBILE_OVERLAY_TITLE[activeMobileTab]}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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

      <div className="hidden min-w-0 self-stretch xl:flex xl:min-w-64 xl:flex-1 xl:shrink">
        <ChatPanel
          currentUserName={currentUserName}
          currentUserProfileImage={currentUserProfileImage}
          roomId={roomId}
        />
      </div>

      {/* 탭 전환 버튼: 오버레이보다 항상 위(z-40)에 떠서 오버레이가 열려있어도 누를 수 있다.
          아래 DialogPrimitive.Content의 onInteractOutside에서 이 영역(tabBarRef)은 "바깥 상호작용"에서
          제외해야 한다 — 안 그러면 탭을 누르는 pointerdown 자체가 먼저 다이얼로그를 닫아버리고,
          뒤이은 click이 다시 다른 탭을 열면서 열림/닫힘이 겹쳐 깜빡이는 레이스가 생긴다.
          가로모드에서는 옆 패널로 대체되므로 숨긴다. */}
      <div className="fixed inset-x-0 bottom-16 z-40 xl:hidden landscape:hidden" ref={tabBarRef}>
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
          className="absolute inset-x-0 bottom-28 z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom xl:hidden landscape:hidden"
          data-testid="room-mobile-overlay"
          style={{ height: mobileOverlayHeight }}
          onInteractOutside={(event) => {
            const target = event.detail.originalEvent.target as Node | null;
            if (target && tabBarRef.current?.contains(target)) {
              event.preventDefault();
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {renderedMobileTab ? MOBILE_OVERLAY_TITLE[renderedMobileTab] : ''}
          </DialogPrimitive.Title>
          {renderedMobileTab ? (
            <>
              <MobileOverlayHeader
                action={renderedMobileTab === 'members' ? <KickedMembersButton /> : undefined}
                title={MOBILE_OVERLAY_TITLE[renderedMobileTab]}
                onClose={closeMobileTab}
              />
              {renderedMobileTab === 'playlist' ? playlistPanel : null}
              {renderedMobileTab === 'members' ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <MemberList />
                </div>
              ) : null}
              {renderedMobileTab === 'chat' ? (
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
