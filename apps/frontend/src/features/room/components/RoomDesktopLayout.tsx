'use client';

// PC Room 화면의 멤버, 플레이어, 플레이리스트, 채팅 영역을 배치한다.
import type { ReactNode } from 'react';

import type { ChatMessage, RoomMember } from '@/shared/types/domain';

import { ChatPanel } from './ChatPanel';
import { MemberSidebar } from './MemberSidebar';

export function RoomDesktopLayout({
  chats,
  members,
  renderPlayerPanel,
  renderPlaylistPanel,
}: {
  chats: ChatMessage[];
  members: RoomMember[];
  renderPlayerPanel: () => ReactNode;
  renderPlaylistPanel: () => ReactNode;
}) {
  return (
    <section className="hidden min-h-0 flex-1 overflow-hidden border-b border-border xl:flex">
      <div className="flex w-48 shrink-0 self-stretch xl:w-52">
        <MemberSidebar members={members} />
      </div>
      <div className="min-w-0 flex-1 self-stretch border-r border-border px-6 py-6">
        {renderPlayerPanel()}
      </div>
      <div className="flex w-64 min-w-0 shrink-0 self-stretch xl:w-72">{renderPlaylistPanel()}</div>
      <div className="flex w-64 min-w-0 shrink-0 self-stretch xl:w-72">
        <ChatPanel chats={chats} />
      </div>
    </section>
  );
}
