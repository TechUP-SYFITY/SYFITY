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
    <section className="hidden min-h-0 flex-1 grid-cols-[200px_minmax(320px,1fr)_280px_280px] overflow-hidden border-b border-white/[0.07] lg:grid">
      <MemberSidebar members={members} />
      <div className="min-w-0 border-r border-white/[0.07] px-6 py-6">{renderPlayerPanel()}</div>
      {renderPlaylistPanel()}
      <ChatPanel chats={chats} />
    </section>
  );
}
