'use client';

// 모바일 Room 화면의 playlist, members, chat 탭을 표시한다.
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';

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
    <Tabs value={activeTab} onValueChange={(value) => onChange(value as RoomMobileTab)}>
      <TabsList className="grid h-12 grid-cols-3 border-t border-white/[0.07] bg-[#09090b]">
        {tabs.map((tab) => (
          <TabsTrigger className="h-12 text-sm" key={tab.id} value={tab.id}>
            <RoomIcon name={tab.icon} className="h-3.5 w-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
