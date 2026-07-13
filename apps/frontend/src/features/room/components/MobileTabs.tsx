'use client';

// 모바일 Room 화면의 playlist, members, chat 탭을 표시한다.
import { ListMusic, MessageCircle, Users, type LucideIcon } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';

export type RoomMobileTab = 'playlist' | 'members' | 'chat';

export function MobileTabs({
  activeTab,
  onChange,
}: {
  activeTab: RoomMobileTab;
  onChange: (tab: RoomMobileTab) => void;
}) {
  const tabs: Array<{ id: RoomMobileTab; label: string; icon: LucideIcon }> = [
    { icon: ListMusic, id: 'playlist', label: '재생목록' },
    { icon: Users, id: 'members', label: '멤버' },
    { icon: MessageCircle, id: 'chat', label: '채팅' },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(value) => onChange(value as RoomMobileTab)}>
      <TabsList className="grid h-12 grid-cols-3 border-t border-border bg-background">
        {tabs.map((tab) => (
          <TabsTrigger className="h-12 text-sm" key={tab.id} value={tab.id}>
            <tab.icon className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
