'use client';

import { useState } from 'react';

import { isMockingEnabled } from '@/shared/lib/env';
import { simulateServerEvent } from '@/shared/lib/socket/fakeSocketClient';
import type { ChatMessage, RoomMember } from '@/shared/types/domain';

type SimulatedMember = Omit<RoomMember, 'id'>;
type PresenceAction = '입장' | '퇴장';

function createSimulatedMember(): SimulatedMember {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36)}`;

  return {
    nickname: `깜짝 게스트 ${Math.floor(Math.random() * 1000)}`,
    profileImage: null,
    role: 'member',
    status: 'online',
    userId: `dev-simulated-${id}`,
  };
}

function createSystemMessage(member: SimulatedMember, action: PresenceAction): ChatMessage {
  return {
    createdAt: new Date().toISOString(),
    id: `mock-presence-${member.userId}-${action}`,
    message: `${member.nickname}님이 ${action}했습니다.`,
    nickname: null,
    profileImage: null,
    type: 'system',
    userId: null,
  };
}

export function PresenceMockPanel() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [simulatedMembers, setSimulatedMembers] = useState<SimulatedMember[]>([]);

  if (!isMockingEnabled()) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-lg">
      <p className="font-bold text-muted-foreground">Presence Dev Tools</p>
      <button
        className="rounded-lg bg-primary/15 px-2 py-1 text-primary"
        onClick={() => {
          const member = createSimulatedMember();

          simulateServerEvent('presence:update', member);
          simulateServerEvent('chat:system', createSystemMessage(member, '입장'));
          setSimulatedMembers((members) => [...members, member]);
          setLastAction(`${member.nickname}님이 입장했습니다.`);
        }}
        type="button"
      >
        가상 멤버 입장 시뮬레이션
      </button>
      <button
        className="rounded-lg bg-accent/15 px-2 py-1 text-accent"
        onClick={() => {
          const simulatedMember = simulatedMembers.at(-1);

          if (!simulatedMember) {
            return;
          }

          simulateServerEvent('presence:update', { ...simulatedMember, status: 'left' });
          simulateServerEvent('chat:system', createSystemMessage(simulatedMember, '퇴장'));
          setLastAction(`${simulatedMember.nickname}님이 퇴장했습니다.`);
          setSimulatedMembers((members) => members.slice(0, -1));
        }}
        disabled={simulatedMembers.length === 0}
        type="button"
      >
        가상 멤버 퇴장 시뮬레이션
      </button>
      {lastAction ? <p className="text-white/40">{lastAction}</p> : null}
    </div>
  );
}
