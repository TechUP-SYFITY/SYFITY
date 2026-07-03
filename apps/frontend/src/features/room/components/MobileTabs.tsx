'use client';

// 모바일 Room 화면의 playlist, members, chat 탭을 표시한다.
import { RoomIcon } from './RoomIcon';
import type { RoomIconName } from './RoomIcon';

export type RoomMobileTab = 'playlist' | 'members' | 'chat';

export function MobileTabs({
  activeTab,
  onChange,
}: {
  activeTab: RoomMobileTab;
  onChange: (tab: RoomMobileTab) => void;
}) {
  const tabs: Array<{ id: RoomMobileTab; label: string; icon: RoomIconName }> = [
    { icon: 'playlist', id: 'playlist', label: '재생목록' },
    { icon: 'users', id: 'members', label: '멤버' },
    { icon: 'chat', id: 'chat', label: '채팅' },
  ];

  return (
    <div className="grid grid-cols-3 border-t border-white/[0.07] bg-[#09090b]">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            className={`relative flex h-12 items-center justify-center gap-1.5 text-sm font-bold ${
              isActive ? 'text-[#72f4a4]' : 'text-white/42'
            }`}
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
          >
            <RoomIcon name={tab.icon} className="h-3.5 w-3.5" />
            {tab.label}
            {isActive ? <span className="absolute bottom-0 h-0.5 w-full bg-[#72f4a4]" /> : null}
          </button>
        );
      })}
    </div>
  );
}
