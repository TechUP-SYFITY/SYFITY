import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatEmojiPicker } from './ChatEmojiPicker';

vi.mock('emoji-picker-react', () => ({
  default: ({
    emojiVersion,
    height,
    onEmojiClick,
    previewConfig,
    width,
  }: {
    emojiVersion?: string;
    height?: number | string;
    onEmojiClick: (emojiData: { emoji: string }) => void;
    previewConfig?: { showPreview?: boolean };
    width?: number | string;
  }) => (
    <button
      data-emoji-version={emojiVersion}
      data-height={height}
      data-show-preview={previewConfig?.showPreview}
      data-width={width}
      type="button"
      onClick={() => onEmojiClick({ emoji: '😀' })}
    >
      피커 이모지 선택
    </button>
  ),
  EmojiStyle: { NATIVE: 'native' },
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

  it('입력 폼 안에서 우측 정렬되고 반응형 크기를 사용한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker.parentElement).toHaveClass(
      'absolute',
      'right-0',
      'w-full',
      'max-w-[350px]',
      'h-[min(300px,calc(100dvh-12rem))]',
    );
    expect(picker).toHaveAttribute('data-width', '100%');
    expect(picker).toHaveAttribute('data-height', '100%');
  });

  it('Unicode 12.1 이하의 이모지만 표시한다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-emoji-version', '12.1');
  });

  it('미리보기와 카테고리 탐색 영역을 숨긴다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).toHaveAttribute('data-show-preview', 'false');
    expect(picker.parentElement).toHaveClass('chat-emoji-picker');
  });
});
