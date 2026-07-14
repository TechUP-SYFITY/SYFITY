'use client';

// Host 연결 대기 시간과 Room 종료 상태를 안내한다.
import { RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { RoomClosedReason } from '@/shared/types/domain';

import type { HostConnectionState } from '../roomTypes';

interface HostConnectionNoticeProps {
  hostConnection: Exclude<HostConnectionState, { status: 'connected' }>;
}

const closedReasonMessage: Record<RoomClosedReason, string> = {
  'host-closed': 'Host가 방을 종료했습니다.',
  'host-left': 'Host가 방을 나갔습니다.',
  'host-timeout': 'Host가 돌아오지 않아 방이 종료되었습니다.',
};

export function HostConnectionNotice({ hostConnection }: HostConnectionNoticeProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (hostConnection.status !== 'disconnected') {
      return undefined;
    }

    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, [hostConnection.status]);

  const isClosed = hostConnection.status === 'closed';
  const remainingSeconds =
    hostConnection.status === 'disconnected'
      ? getRemainingSeconds(hostConnection.waitUntil, currentTime)
      : 0;
  const message = isClosed
    ? closedReasonMessage[hostConnection.reason]
    : '호스트 연결이 끊겼습니다. 재접속을 기다리는 중...';

  return (
    <div
      className="flex h-9 items-center gap-2 bg-accent/15 px-5 text-xs text-accent-300"
      role="status"
    >
      <WifiOff className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {isClosed ? null : (
        <>
          <span className="font-bold tabular-nums">{formatRemainingTime(remainingSeconds)}</span>
          <RefreshCw className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
        </>
      )}
    </div>
  );
}

function getRemainingSeconds(waitUntil: string, currentTime: number) {
  const waitUntilTime = Date.parse(waitUntil);

  if (Number.isNaN(waitUntilTime)) {
    return 0;
  }

  return Math.max(0, Math.ceil((waitUntilTime - currentTime) / 1000));
}

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
