'use client';

// Room 화면의 PC와 모바일 레이아웃을 features 컴포넌트로 조립한다.
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import type {
  ChatMessage,
  PlaybackState,
  PlaylistItem,
  RoomDetail,
  RoomMember,
} from '@/shared/types/domain';

import { ChatPanel } from './components/ChatPanel';
import { HostConnectionNotice } from './components/HostConnectionNotice';
import { MemberList } from './components/MemberList';
import { MemberSidebar } from './components/MemberSidebar';
import { MiniPlayer } from './components/MiniPlayer';
import { MobileTabs } from './components/MobileTabs';
import type { RoomMobileTab } from './components/MobileTabs';
import { RoomIcon } from './components/RoomIcon';

export type { RoomMobileTab } from './components/MobileTabs';

interface RoomShellProps {
  activeMobileTab: RoomMobileTab;
  chats: ChatMessage[];
  isHost: boolean;
  members: RoomMember[];
  onMobileTabChange: (tab: RoomMobileTab) => void;
  playbackState: PlaybackState | null;
  playlist: PlaylistItem[];
  renderPlayerPanel: () => ReactNode;
  renderPlaylistPanel: () => ReactNode;
  room: RoomDetail | null;
}

export function RoomShell({
  activeMobileTab,
  chats,
  isHost,
  members,
  onMobileTabChange,
  playbackState,
  playlist,
  renderPlayerPanel,
  renderPlaylistPanel,
  room,
}: RoomShellProps) {
  const currentTrack = useMemo(
    () => playlist.find((item) => item.id === playbackState?.playlistItemId) ?? playlist[0],
    [playbackState?.playlistItemId, playlist],
  );
  const onlineMemberCount = members.filter((member) => member.status === 'online').length;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#09090b]/95 px-5 md:px-6">
          <div className="flex items-center gap-2">
            <RoomIcon
              name="brand"
              className="h-8 w-8 text-[#72f4a4] drop-shadow-[0_0_14px_rgba(114,244,164,0.35)]"
            />
            <span className="text-base font-bold tracking-[-0.02em]">Syfity</span>
          </div>
          <button
            className="flex items-center gap-2 rounded-2xl p-1 text-sm text-white"
            type="button"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-700 text-xs font-semibold">
              민
            </span>
            <span className="hidden font-semibold md:inline">민지</span>
            <RoomIcon name="chevronDown" className="h-3.5 w-3.5 text-white/45" />
          </button>
        </header>

        <section className="flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#09090b]/95 px-5 md:px-6">
          <div>
            <h1 className="text-sm font-bold">{room?.name ?? 'Room'}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#72f4a4]" />
              {onlineMemberCount}명 접속 중
            </p>
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#72f4a4]/25 bg-[#72f4a4]/10 text-[#72f4a4] shadow-[0_0_16px_rgba(114,244,164,0.12)] md:h-8 md:w-auto md:px-4 md:text-xs md:font-bold"
            type="button"
          >
            <RoomIcon name="share" className="h-3.5 w-3.5" />
            <span className="hidden md:inline">초대</span>
          </button>
        </section>

        <section className="hidden min-h-0 flex-1 grid-cols-[200px_minmax(320px,1fr)_280px_280px] overflow-hidden border-b border-white/[0.07] lg:grid">
          <MemberSidebar members={members} />
          <div className="min-w-0 border-r border-white/[0.07] px-6 py-6">
            {renderPlayerPanel()}
          </div>
          {renderPlaylistPanel()}
          <ChatPanel chats={chats} />
        </section>

        <section className="flex flex-1 flex-col overflow-hidden lg:hidden">
          {!isHost ? <HostConnectionNotice /> : null}
          <div className="px-5 py-4">{renderPlayerPanel()}</div>
          <MobileTabs activeTab={activeMobileTab} onChange={onMobileTabChange} />
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.07] pb-20">
            {activeMobileTab === 'playlist' ? renderPlaylistPanel() : null}
            {activeMobileTab === 'members' ? <MemberList members={members} /> : null}
            {activeMobileTab === 'chat' ? <ChatPanel chats={chats} compact /> : null}
          </div>
        </section>

        <MiniPlayer currentTrack={currentTrack} isPlaying={playbackState?.isPlaying ?? false} />
      </div>
    </main>
  );
}
