import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RoomMemberSummary } from '@syfity/shared';

import { MemberActionMenu } from './MemberActionMenu';

const member = {
  id: 'membership-1',
  nickname: '지민',
  profileImage: null,
  role: 'member',
  status: 'online',
  userId: 'member-1',
} satisfies RoomMemberSummary;

afterEach(cleanup);

describe('MemberActionMenu', () => {
  it('멤버 행을 누르면 옆에 추방 메뉴를 표시한다', async () => {
    const onRequestKick = vi.fn();

    render(
      <MemberActionMenu member={member} onRequestKick={onRequestKick}>
        <span>지민 멤버 행</span>
      </MemberActionMenu>,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: '지민 멤버 관리' }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: '추방' }));

    expect(onRequestKick).toHaveBeenCalledWith(member);
  });

  it('비활성 상태에서는 관리 메뉴를 열 수 없다', () => {
    render(
      <MemberActionMenu disabled member={member} onRequestKick={vi.fn()}>
        <span>지민 멤버 행</span>
      </MemberActionMenu>,
    );

    expect(screen.getByRole('button', { name: '지민 멤버 관리' })).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: '추방' })).not.toBeInTheDocument();
  });
});
