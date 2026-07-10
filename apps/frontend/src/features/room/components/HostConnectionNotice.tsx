'use client';

// Host 연결 끊김 안내 배너의 자리 UI를 표시한다.
import { RoomIcon } from './RoomIcon';

export function HostConnectionNotice() {
  return (
    <div className="flex h-9 items-center gap-2 bg-accent/15 px-5 text-xs text-accent-300">
      <RoomIcon name="wifiOff" className="h-3.5 w-3.5" />
      <span className="min-w-0 flex-1 truncate">
        호스트 연결이 끊겼습니다. 재접속을 기다리는 중...
      </span>
      <span className="font-bold">0:25</span>
      <RoomIcon name="refresh" className="h-3.5 w-3.5" />
    </div>
  );
}
