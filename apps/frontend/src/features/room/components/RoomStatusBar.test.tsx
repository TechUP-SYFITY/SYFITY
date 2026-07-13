// Room 정보 유무에 따른 초대 버튼 상태를 검증한다.
import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RoomStatusBar } from './RoomStatusBar';

describe('RoomStatusBar', () => {
  afterEach(cleanup);

  it('Room 정보가 없으면 초대 버튼을 비활성화한다', () => {
    const onInviteClick = vi.fn();
    render(<RoomStatusBar onlineMemberCount={0} room={null} onInviteClick={onInviteClick} />);

    const inviteButton = screen.getByRole('button', { name: '초대' });
    expect(inviteButton).toBeDisabled();

    fireEvent.click(inviteButton);

    expect(onInviteClick).not.toHaveBeenCalled();
  });
});
