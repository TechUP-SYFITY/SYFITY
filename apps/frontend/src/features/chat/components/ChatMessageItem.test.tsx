import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/shared/types/domain';

import { ChatMessageItem } from './ChatMessageItem';

const chat: ChatMessage = {
  createdAt: '2026-07-01T10:12:00.000Z',
  id: 'chat-1',
  message: '첫 줄\n둘째 줄',
  nickname: '민지',
  profileImage: null,
  type: 'user',
  userId: 'user-1',
};

describe('ChatMessageItem', () => {
  it('메시지 본문의 줄바꿈을 유지하는 스타일로 렌더링한다', () => {
    render(<ChatMessageItem chat={chat} />);

    expect(screen.getByText((_, element) => element?.textContent === chat.message)).toHaveClass(
      'whitespace-pre-wrap',
    );
  });
});
