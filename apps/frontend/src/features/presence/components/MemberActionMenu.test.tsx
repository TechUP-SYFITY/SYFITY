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
  it('세로 점 버튼을 누르면 멤버 추방 메뉴를 표시한다', async () => {
    const onRequestKick = vi.fn();

    render(<MemberActionMenu member={member} onRequestKick={onRequestKick} />);

    const trigger = screen.getByRole('button', { name: '지민 멤버 관리' });

    expect(trigger.querySelector('svg')).toHaveClass('lucide-ellipsis-vertical');

    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: '멤버 추방' }));

    expect(onRequestKick).toHaveBeenCalledWith(member);
  });

  it('비활성 상태에서는 관리 메뉴를 열 수 없다', () => {
    render(<MemberActionMenu disabled member={member} onRequestKick={vi.fn()} />);

    expect(screen.getByRole('button', { name: '지민 멤버 관리' })).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: '멤버 추방' })).not.toBeInTheDocument();
  });
});
