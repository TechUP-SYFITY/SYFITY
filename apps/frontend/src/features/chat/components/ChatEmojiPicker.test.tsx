import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatEmojiPicker } from './ChatEmojiPicker';

vi.mock('emoji-picker-react', () => ({
  default: ({
    categories,
    emojiVersion,
    height,
    onEmojiClick,
    previewConfig,
    width,
  }: {
    categories?: string[];
    emojiVersion?: string;
    height?: number | string;
    onEmojiClick: (emojiData: { emoji: string }) => void;
    previewConfig?: { showPreview?: boolean };
    width?: number | string;
  }) => (
    <button
      data-categories={categories?.join(',')}
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
  Categories: {
    ACTIVITIES: 'activities',
    ANIMALS_NATURE: 'animals_nature',
    CUSTOM: 'custom',
    FLAGS: 'flags',
    FOOD_DRINK: 'food_drink',
    OBJECTS: 'objects',
    SMILEYS_PEOPLE: 'smileys_people',
    SUGGESTED: 'suggested',
    SYMBOLS: 'symbols',
    TRAVEL_PLACES: 'travel_places',
  },
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

  it('플래그 카테고리를 표시하지 않는다', async () => {
    render(<ChatEmojiPicker onEmojiSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '이모지 선택기 열기' }));
    const picker = await screen.findByRole('button', { name: '피커 이모지 선택' });

    expect(picker).not.toHaveAttribute('data-categories', expect.stringContaining('flags'));
    expect(picker).toHaveAttribute('data-categories', expect.stringContaining('symbols'));
  });
});
