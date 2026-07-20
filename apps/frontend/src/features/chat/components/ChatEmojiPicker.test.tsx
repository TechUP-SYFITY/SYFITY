import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatEmojiPicker } from './ChatEmojiPicker';

vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }: { onEmojiClick: (emojiData: { emoji: string }) => void }) => (
    <button type="button" onClick={() => onEmojiClick({ emoji: '😀' })}>
      피커 이모지 선택
    </button>
  ),
}));

describe('ChatEmojiPicker', () => {
  afterEach(() => {
    cleanup();
  });

  it('선택한 Unicode 이모지를 상위 컴포넌트에 전달한다', async () => {
    const onEmojiSelect = vi.fn();
    render(<ChatEmojiPicker onEmojiSelect={onEmojiSelect} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    fireEvent.click(await screen.findByRole('button', { name: '피커 이모지 선택' }));

    expect(onEmojiSelect).toHaveBeenCalledWith('😀');
  });
});
