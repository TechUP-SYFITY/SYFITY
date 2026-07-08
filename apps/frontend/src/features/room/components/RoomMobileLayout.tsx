'use client';

// 모바일 Room 화면의 플레이어와 playlist/member/chat 탭 영역을 배치한다.
import type { ReactNode } from 'react';

import type { ChatMessage, RoomMember } from '@/shared/types/domain';

import { ChatPanel } from './ChatPanel';
import { HostConnectionNotice } from './HostConnectionNotice';
import { MemberList } from './MemberList';
import { MobileTabs } from './MobileTabs';
import type { RoomMobileTab } from './MobileTabs';

export function RoomMobileLayout({
  activeMobileTab,
  chats,
  currentUserName,
  isHost,
  members,
  onMobileTabChange,
  renderPlayerPanel,
  renderPlaylistPanel,
}: {
  activeMobileTab: RoomMobileTab;
  chats: ChatMessage[];
  currentUserName?: string;
  isHost: boolean;
  members: RoomMember[];
  onMobileTabChange: (tab: RoomMobileTab) => void;
  renderPlayerPanel: () => ReactNode;
  renderPlaylistPanel: () => ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden xl:hidden">
      {!isHost ? <HostConnectionNotice /> : null}
      <div className="shrink-0 px-5 py-4">{renderPlayerPanel()}</div>
      <MobileTabs activeTab={activeMobileTab} onChange={onMobileTabChange} />
      <div className="min-h-0 flex-1 scrollbar-none overflow-y-auto border-t border-border pb-16">
        {activeMobileTab === 'playlist' ? renderPlaylistPanel() : null}
        {activeMobileTab === 'members' ? <MemberList members={members} /> : null}
        {activeMobileTab === 'chat' ? (
          <ChatPanel chats={chats} compact currentUserName={currentUserName} />
        ) : null}
      </div>
    </section>
  );
}
