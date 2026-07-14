// Host 연결 대기 시간과 Room 종료 안내 문구를 검증한다.
import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HostConnectionNotice } from './HostConnectionNotice';

describe('HostConnectionNotice', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('서버 waitUntil을 기준으로 남은 시간을 갱신한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T07:59:35.000Z'));

    render(
      <HostConnectionNotice
        hostConnection={{ status: 'disconnected', waitUntil: '2026-07-13T08:00:00.000Z' }}
      />,
    );

    expect(screen.getByText('0:25')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('0:24')).toBeInTheDocument();
  });

  it.each([
    ['host-left', 'Host가 방을 나갔습니다.'],
    ['host-timeout', 'Host가 돌아오지 않아 방이 종료되었습니다.'],
    ['host-closed', 'Host가 방을 종료했습니다.'],
  ] as const)('%s 종료 사유를 안내한다', (reason, message) => {
    render(<HostConnectionNotice hostConnection={{ reason, status: 'closed' }} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
