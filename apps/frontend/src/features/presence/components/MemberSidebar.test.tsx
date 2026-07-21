import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemberSidebar } from './MemberSidebar';

vi.mock('./KickedMembersButton', () => ({
  KickedMembersButton: () => <button type="button">추방 관리</button>,
}));

vi.mock('./MemberList', () => ({
  MemberList: () => <div data-testid="member-list" />,
}));

describe('MemberSidebar', () => {
  afterEach(cleanup);

  it('멤버 수 옆에 추방 관리 진입 버튼을 배치한다', () => {
    render(<MemberSidebar members={[]} />);

    expect(screen.getByRole('button', { name: '추방 관리' })).toBeInTheDocument();
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
  });
});
