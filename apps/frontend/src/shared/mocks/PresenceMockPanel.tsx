'use client';

import { Minus } from 'lucide-react';
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

function findLatestMember(
  members: SimulatedMember[],
  status: SimulatedMember['status'],
): SimulatedMember | undefined {
  return members.findLast((member) => member.status === status);
}

export function PresenceMockPanel() {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [simulatedMembers, setSimulatedMembers] = useState<SimulatedMember[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  if (!isMockingEnabled()) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        className="fixed right-4 bottom-4 z-50 rounded-xl border border-border bg-background/95 px-3 py-2 text-xs font-bold text-muted-foreground shadow-lg"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Presence Dev Tools
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 rounded-xl border border-border bg-background/95 p-3 text-xs shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-muted-foreground">Presence Dev Tools</p>
        <button
          aria-label="Presence Dev Tools 접기"
          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
      </div>
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
      <button
        className="rounded-lg bg-white/10 px-2 py-1 text-white/70"
        onClick={() => {
          const simulatedMember = findLatestMember(simulatedMembers, 'online');

          if (!simulatedMember) {
            return;
          }

          const offlineMember = { ...simulatedMember, status: 'offline' as const };
          simulateServerEvent('presence:update', offlineMember);
          setLastAction(`${offlineMember.nickname}님의 연결이 끊겼습니다.`);
          setSimulatedMembers((members) =>
            members.map((member) =>
              member.userId === offlineMember.userId ? offlineMember : member,
            ),
          );
        }}
        disabled={!simulatedMembers.some((member) => member.status === 'online')}
        type="button"
      >
        가상 멤버 연결 끊김 시뮬레이션
      </button>
      <button
        className="rounded-lg bg-primary/10 px-2 py-1 text-primary"
        onClick={() => {
          const simulatedMember = findLatestMember(simulatedMembers, 'offline');

          if (!simulatedMember) {
            return;
          }

          const reconnectedMember = { ...simulatedMember, status: 'online' as const };
          simulateServerEvent('presence:update', reconnectedMember);
          simulateServerEvent('chat:system', createSystemMessage(reconnectedMember, '입장'));
          setLastAction(`${reconnectedMember.nickname}님이 재접속했습니다.`);
          setSimulatedMembers((members) =>
            members.map((member) =>
              member.userId === reconnectedMember.userId ? reconnectedMember : member,
            ),
          );
        }}
        disabled={!simulatedMembers.some((member) => member.status === 'offline')}
        type="button"
      >
        가상 멤버 재접속 시뮬레이션
      </button>
      {lastAction ? <p className="text-white/40">{lastAction}</p> : null}
    </div>
  );
}
