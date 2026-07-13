import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { simulateServerEvent } from '@/shared/lib/socket/fakeSocketClient';

import { PresenceMockPanel } from './PresenceMockPanel';

vi.mock('@/shared/lib/env', () => ({ isMockingEnabled: () => true }));
vi.mock('@/shared/lib/socket/fakeSocketClient', () => ({ simulateServerEvent: vi.fn() }));

describe('PresenceMockPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('가상 게스트 입장 시 presence와 채팅 시스템 이벤트를 함께 주입한다', () => {
    render(<PresenceMockPanel />);

    fireEvent.click(screen.getByRole('button', { name: '가상 멤버 입장 시뮬레이션' }));

    const presenceMember = vi.mocked(simulateServerEvent).mock.calls[0]?.[1];
    expect(presenceMember).toEqual(
      expect.objectContaining({
        nickname: expect.stringMatching(/^깜짝 게스트 /),
        status: 'online',
      }),
    );
    expect(simulateServerEvent).toHaveBeenNthCalledWith(
      2,
      'chat:system',
      expect.objectContaining({
        message: `${(presenceMember as { nickname: string }).nickname}님이 입장했습니다.`,
        type: 'system',
      }),
    );
    expect(screen.getByRole('button', { name: '가상 멤버 입장 시뮬레이션' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '가상 멤버 퇴장 시뮬레이션' })).toBeEnabled();
  });

  it('입장시킨 동일한 가상 게스트만 퇴장 이벤트로 처리한다', () => {
    render(<PresenceMockPanel />);

    fireEvent.click(screen.getByRole('button', { name: '가상 멤버 입장 시뮬레이션' }));
    const joinedMember = vi.mocked(simulateServerEvent).mock.calls[0]?.[1] as {
      nickname: string;
      userId: string;
    };

    fireEvent.click(screen.getByRole('button', { name: '가상 멤버 퇴장 시뮬레이션' }));

    expect(simulateServerEvent).toHaveBeenNthCalledWith(
      3,
      'presence:update',
      expect.objectContaining({
        nickname: joinedMember.nickname,
        status: 'left',
        userId: joinedMember.userId,
      }),
    );
    expect(simulateServerEvent).toHaveBeenNthCalledWith(
      4,
      'chat:system',
      expect.objectContaining({
        message: `${joinedMember.nickname}님이 퇴장했습니다.`,
        type: 'system',
      }),
    );
    expect(screen.getByRole('button', { name: '가상 멤버 입장 시뮬레이션' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '가상 멤버 퇴장 시뮬레이션' })).toBeDisabled();
  });
});
