'use client';

// Room의 공통 Player와 Playlist를 한 번만 렌더링하고 반응형 영역을 배치한다.
import type { ReactNode } from 'react';

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

export function RoomLayout({
  activeMobileTab,
  currentUserName,
  currentUserProfileImage,
  onMobileTabChange,
  renderPlayerPanel,
  renderPlaylistPanel,
  roomId,
}: RoomLayoutProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border xl:flex-row">
      <div className="hidden w-room-members shrink-0 self-stretch xl:flex">
        <MemberSidebar />
      </div>

      <div
        className="shrink-0 px-5 py-4 xl:min-w-0 xl:flex-1 xl:self-stretch xl:border-r xl:border-border xl:px-6 xl:py-6"
        data-testid="room-player-slot"
      >
        {renderPlayerPanel()}
      </div>

      <div className="shrink-0 xl:hidden">
        <MobileTabs activeTab={activeMobileTab} onChange={onMobileTabChange} />
      </div>

      {activeMobileTab === 'members' ? (
        <div className="min-h-0 flex-1 scrollbar-none overflow-y-auto border-t border-border pb-[calc(4rem+env(safe-area-inset-bottom))] xl:hidden">
          <MemberList />
        </div>
      ) : null}

      {activeMobileTab === 'chat' ? (
        <div className="min-h-0 flex-1 overflow-hidden border-t border-border pb-[calc(4rem+env(safe-area-inset-bottom))] xl:hidden">
          <ChatPanel
            currentUserName={currentUserName}
            currentUserProfileImage={currentUserProfileImage}
            roomId={roomId}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1 scrollbar-none overflow-y-auto border-t border-border pb-[calc(4rem+env(safe-area-inset-bottom))]',
          activeMobileTab === 'playlist' ? 'flex' : 'hidden',
          'xl:flex xl:w-room-side xl:flex-none xl:shrink-0 xl:self-stretch xl:overflow-hidden xl:border-t-0 xl:pb-0',
        )}
        data-testid="room-playlist-slot"
      >
        {renderPlaylistPanel()}
      </div>

      <div className="hidden w-room-side min-w-0 shrink-0 self-stretch xl:flex">
        <ChatPanel
          currentUserName={currentUserName}
          currentUserProfileImage={currentUserProfileImage}
          roomId={roomId}
        />
      </div>
    </section>
  );
}
