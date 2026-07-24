'use client';

// 모바일 Room 화면의 playlist, members, chat 탭을 표시한다.
import { ListMusic, MessageCircle, Users, type LucideIcon } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui';

export type RoomMobileTab = 'playlist' | 'members' | 'chat';

export function MobileTabs({
  activeTab,
  onChange,
}: {
  activeTab: RoomMobileTab | null;
  onChange: (tab: RoomMobileTab) => void;
}) {
  const tabs: Array<{ id: RoomMobileTab; label: string; icon: LucideIcon }> = [
    { icon: ListMusic, id: 'playlist', label: '재생목록' },
    { icon: Users, id: 'members', label: '멤버' },
    { icon: MessageCircle, id: 'chat', label: '채팅' },
  ];

  return (
    // Radix Tabs.Root의 onValueChange는 controlled value가 그대로면 호출 안 되고,
    // mousedown/focus 등 여러 내부 경로가 한 제스처 안에서 겹쳐 있어 재탭-닫기 토글과
    // 타이밍이 어긋나기 쉽다(state가 이미 바뀐 뒤 늦게 도착한 경로가 되돌려버림).
    // 그래서 onValueChange는 쓰지 않고, 탭당 정확히 한 번만 도는 onClick 하나로
    // 상태 전이를 전담시킨다. 열림/닫힘 토글 판단은 부모의 functional setState가 한다.
    <Tabs value={activeTab ?? ''}>
      <TabsList className="grid h-12 grid-cols-3 border-t border-border bg-background xl:h-12 landscape:h-10">
        {tabs.map((tab) => (
          <TabsTrigger
            className="h-12 text-sm xl:h-12 xl:text-sm landscape:h-10 landscape:text-xs"
            key={tab.id}
            onClick={() => onChange(tab.id)}
            value={tab.id}
          >
            <tab.icon className="inline-block size-3.5 shrink-0" aria-hidden />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
