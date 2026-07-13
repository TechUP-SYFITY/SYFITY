'use client';

import { useState } from 'react';

import { isMockingEnabled } from '@/shared/lib/env';
import { simulateServerEvent } from '@/shared/lib/socket/fakeSocketClient';
import type { RoomMember } from '@/shared/types/domain';

import { roomFixture } from './fixtures/roomFixture';

function simulateMemberJoin() {
  const simulatedMember: Omit<RoomMember, 'id'> = {
    nickname: `깜짝 게스트 ${Math.floor(Math.random() * 1000)}`,
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: `dev-simulated-${Date.now()}`,
  };

  simulateServerEvent('presence:update', simulatedMember);
}

function simulateMemberLeave() {
  const target = roomFixture.members.find((member) => member.role !== 'host');

  if (!target) {
    return;
  }

  simulateServerEvent('presence:update', { ...target, status: 'left' });
}

export function PresenceMockPanel() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (!isMockingEnabled()) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-lg">
      <p className="font-bold text-muted-foreground">Presence Dev Tools</p>
      <button
        className="rounded-lg bg-primary/15 px-2 py-1 text-primary"
        onClick={() => {
          simulateMemberJoin();
          setLastAction('가상 멤버가 입장했습니다.');
        }}
        type="button"
      >
        가상 멤버 입장 시뮬레이션
      </button>
      <button
        className="rounded-lg bg-accent/15 px-2 py-1 text-accent"
        onClick={() => {
          simulateMemberLeave();
          setLastAction('가상 멤버가 퇴장했습니다.');
        }}
        type="button"
      >
        가상 멤버 퇴장 시뮬레이션
      </button>
      {lastAction ? <p className="text-white/40">{lastAction}</p> : null}
    </div>
  );
}
